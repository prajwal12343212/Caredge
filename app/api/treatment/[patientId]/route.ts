import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { patientId: string } }
) {
  try {
    const patientId = params.patientId;
    
    const { data: treatments, error } = await supabaseServer
      .from('treatment_details')
      .select('*, profiles!doctor_id(full_name)')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!treatments || treatments.length === 0) {
      return NextResponse.json({ treatments: [] });
    }

    const doctorIds = Array.from(new Set(treatments.map((t: any) => t.doctor_id)));
    
    const { data: doctorProfiles } = await supabaseServer
      .from('doctor_profiles')
      .select('*')
      .in('doctor_id', doctorIds);

    const profileMap = new Map();
    if (doctorProfiles) {
      doctorProfiles.forEach((p: any) => profileMap.set(p.doctor_id, p));
    }

    const enrichedTreatments = treatments.map((t: any) => ({
      ...t,
      doctor_profile: profileMap.get(t.doctor_id) || null
    }));

    return NextResponse.json({ treatments: enrichedTreatments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
