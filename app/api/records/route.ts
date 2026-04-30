import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { logAuditEvent } from '@/lib/audit';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patientId');

  if (!patientId) return NextResponse.json({ error: 'Missing patientId' }, { status: 400 });

  const { data, error } = await supabaseServer
    .from('health_records')
    .select('*')
    .eq('patient_id', patientId)
    .order('uploaded_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ records: data });
}

export async function POST(request: Request) {
  try {
    const { patientId, fileUrl, fileName, fileType } = await request.json();

    if (!patientId || !fileUrl) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('health_records')
      .insert([{
        patient_id: patientId,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType
      }])
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId: patientId,
      userRole: 'patient',
      action: 'RECORD_UPLOADED',
      patientId: patientId,
      targetType: 'record',
      targetId: data.id,
      description: `Uploaded new health record: ${fileName}`,
      req: request
    });

    return NextResponse.json({ success: true, record: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
