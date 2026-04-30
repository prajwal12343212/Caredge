import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctorId');

    if (!doctorId) {
      return NextResponse.json({ error: 'Doctor ID is required' }, { status: 400 });
    }

    const { data: profile, error } = await supabaseServer
      .from('doctor_profiles')
      .select('*')
      .eq('doctor_id', doctorId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw error;
    }

    return NextResponse.json({ profile: profile || null });
  } catch (error: any) {
    console.error('Error fetching doctor profile:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { doctor_id, ...profileData } = body;

    if (!doctor_id) {
      return NextResponse.json({ error: 'Doctor ID is required' }, { status: 400 });
    }

    // Check if profile exists
    const { data: existingProfile } = await supabaseServer
      .from('doctor_profiles')
      .select('doctor_id')
      .eq('doctor_id', doctor_id)
      .single();

    let result;

    if (existingProfile) {
      // Update
      const { data, error } = await supabaseServer
        .from('doctor_profiles')
        .update({ ...profileData, updated_at: new Date().toISOString() })
        .eq('doctor_id', doctor_id)
        .select()
        .single();
        
      if (error) throw error;
      result = data;
    } else {
      // Insert
      const { data, error } = await supabaseServer
        .from('doctor_profiles')
        .insert([{ doctor_id, ...profileData }])
        .select()
        .single();
        
      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ profile: result });
  } catch (error: any) {
    console.error('Error saving doctor profile:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
