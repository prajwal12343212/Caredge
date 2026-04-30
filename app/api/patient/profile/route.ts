import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patientId');

  if (!patientId) {
    return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseServer
      .from('patient_health_profiles')
      .select('*')
      .eq('patient_id', patientId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw error;
    }

    return NextResponse.json({ profile: data || null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patient_id, ...profileData } = body;

    if (!patient_id) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Upsert the profile
    const { data, error } = await supabaseServer
      .from('patient_health_profiles')
      .upsert({
        patient_id,
        ...profileData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'patient_id' })
      .select()
      .single();

    if (error) throw error;

    // Log the update
    await logAuditEvent({
      userId: patient_id,
      userRole: 'patient',
      action: 'PROFILE_UPDATED',
      patientId: patient_id,
      targetType: 'record',
      targetId: patient_id,
      description: 'Patient updated their personal health profile.',
      req: request
    });

    return NextResponse.json({ profile: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
