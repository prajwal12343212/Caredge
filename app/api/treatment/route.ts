import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { logAuditEvent } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const { doctorId, patientId, tokenId, diagnosis, prescription, notes } = await request.json();

    if (!doctorId || !patientId || !tokenId || !diagnosis) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Verify token is still valid before allowing write
    const { data: tokenRecord, error: tokenError } = await supabaseServer
      .from('access_tokens')
      .select('*')
      .eq('id', tokenId)
      .single();

    if (tokenError || !tokenRecord) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
    }

    if (!tokenRecord.is_active || new Date() > new Date(tokenRecord.expires_at)) {
      return NextResponse.json({ error: 'Token is expired or revoked. Cannot add treatment.' }, { status: 403 });
    }

    // 2. Add treatment details
    const { data, error } = await supabaseServer
      .from('treatment_details')
      .insert([{
        doctor_id: doctorId,
        patient_id: patientId,
        token_id: tokenId,
        diagnosis,
        prescription,
        notes
      }])
      .select()
      .single();

    if (error) throw error;

    // 3. Log action
    await logAuditEvent({
      userId: doctorId,
      userRole: 'doctor',
      action: 'TREATMENT_ADDED',
      patientId: patientId,
      doctorId: doctorId,
      tokenId: tokenId,
      targetType: 'treatment',
      targetId: data.id,
      description: `Added treatment notes for diagnosis: ${diagnosis}`,
      req: request
    });

    return NextResponse.json({ success: true, treatment: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
