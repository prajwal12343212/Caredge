import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');


    // If userId is provided, fetch specific risk score and personal incidents
    if (userId) {
      const trimmedUserId = userId.trim();
      
      const [riskRes, incidentsRes] = await Promise.all([
        supabaseServer
          .from('user_risk_scores')
          .select('*')
          .eq('user_id', trimmedUserId)
          .maybeSingle(),
        supabaseServer
          .from('security_incidents')
          .select('*')
          .eq('user_id', trimmedUserId)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      if (incidentsRes.error) {

      }

      return NextResponse.json({ 
        riskScore: riskRes.data || { total_score: 0, risk_level: 'safe' }, 
        incidents: incidentsRes.data || []
      });
    }

    // For the global Security Dashboard (Admins)
    const { data: allIncidents, error: incidentsError } = await supabaseServer
      .from('security_incidents')
      .select('*, profiles!user_id(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: highRiskUsers, error: usersError } = await supabaseServer
      .from('user_risk_scores')
      .select('*, profiles!user_id(full_name, role)')
      .gt('total_score', 20)
      .order('total_score', { ascending: false });

    return NextResponse.json({ 
      incidents: allIncidents || [],
      highRiskUsers: highRiskUsers || [],
      incidentsError,
      usersError
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
