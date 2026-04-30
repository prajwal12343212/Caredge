import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  let query = supabaseServer.from('security_incidents').select('*');
  if (userId) {
    query = query.eq('user_id', userId.trim());
  }
  
  const { data: incidents, error: incidentsError } = await query.order('created_at', { ascending: false });
  const { data: logs, error: logsError } = await supabaseServer.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(10);
  return NextResponse.json({ userIdProvided: userId, incidents, logs, incidentsError, logsError });
}
