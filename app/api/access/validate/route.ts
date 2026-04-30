import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { logAuditEvent } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const { token, doctorId } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Find the token
    const { data: tokenRecord, error } = await supabaseServer
      .from('access_tokens')
      .select('*, profiles!patient_id(full_name)')
      .eq('token', token)
      .single();

    if (error || !tokenRecord) {
      if (doctorId) {
        await logAuditEvent({
          userId: doctorId,
          userRole: 'doctor',
          action: 'INVALID_TOKEN',
          targetType: 'token',
          doctorId: doctorId,
          description: 'Failed attempt to use an invalid or non-existent token.',
          req: request
        });
      }
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
    }

    if (!tokenRecord.is_active) {
      if (doctorId) {
        await logAuditEvent({
          userId: doctorId,
          userRole: 'doctor',
          action: 'UNAUTHORIZED_ACCESS',
          patientId: tokenRecord.patient_id,
          tokenId: tokenRecord.id,
          targetType: 'token',
          targetId: tokenRecord.id,
          doctorId: doctorId,
          description: 'Failed attempt to use a revoked token.',
          req: request
        });
      }
      return NextResponse.json({ error: 'Token has been revoked' }, { status: 403 });
    }

    const now = new Date();
    const expiresAt = new Date(tokenRecord.expires_at);

    if (now > expiresAt) {
      // Auto-deactivate expired tokens
      await supabaseServer
        .from('access_tokens')
        .update({ is_active: false })
        .eq('id', tokenRecord.id);
        
      if (doctorId) {
        await logAuditEvent({
          userId: doctorId,
          userRole: 'doctor',
          action: 'UNAUTHORIZED_ACCESS',
          patientId: tokenRecord.patient_id,
          tokenId: tokenRecord.id,
          targetType: 'token',
          targetId: tokenRecord.id,
          doctorId: doctorId,
          description: 'Failed attempt to use an expired token.',
          req: request
        });
      }
      return NextResponse.json({ error: 'Token has expired' }, { status: 403 });
    }

    // Log the access if doctorId is provided
    if (doctorId) {
      await logAuditEvent({
        userId: doctorId,
        userRole: 'doctor',
        action: 'SESSION_STARTED',
        patientId: tokenRecord.patient_id,
        doctorId: doctorId,
        tokenId: tokenRecord.id,
        targetType: 'session',
        description: 'Doctor started an active session by validating token.',
        req: request
      });
    }

    return NextResponse.json({ 
      valid: true, 
      token: tokenRecord,
      patientName: tokenRecord.profiles.full_name 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
