import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patientId');
  const doctorId = searchParams.get('doctorId');

  try {
    let query = supabaseServer
      .from('audit_logs')
      .select('*, actor:profiles!actor_id(full_name), patient:profiles!patient_id(full_name), doctor:profiles!doctor_id(full_name)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (patientId) {
      query = query.eq('patient_id', patientId);
    } else if (doctorId) {
      query = query.eq('actor_id', doctorId);
    } else {
      return NextResponse.json({ error: 'Must provide patientId or doctorId' }, { status: 400 });
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ logs: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
