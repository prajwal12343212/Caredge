import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseServer } from '@/lib/supabase-server';
import { logAuditEvent } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const { patientId, durationHours } = await request.json();

    if (!patientId || !durationHours) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate a simple secure random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + durationHours);

    // Save token to database
    const { data, error } = await supabaseServer
      .from('access_tokens')
      .insert([
        {
          patient_id: patientId,
          token,
          expires_at: expiresAt.toISOString(),
          is_active: true
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Log the action
    await logAuditEvent({
      userId: patientId,
      userRole: 'patient',
      action: 'TOKEN_GENERATED',
      patientId: patientId,
      tokenId: data.id,
      targetType: 'token',
      targetId: data.id,
      description: `Generated access token valid for ${durationHours} hour(s).`,
      req: request
    });

    return NextResponse.json({ token: data });
  } catch (error: any) {
    console.error('Token generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
