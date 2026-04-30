import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { logAuditEvent } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const { tokenId, patientId } = await request.json();

    if (!tokenId || !patientId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from('access_tokens')
      .update({ is_active: false })
      .eq('id', tokenId)
      .eq('patient_id', patientId);

    if (error) throw error;

    // Log revocation
    await logAuditEvent({
      userId: patientId,
      userRole: 'patient',
      action: 'TOKEN_REVOKED',
      patientId: patientId,
      tokenId: tokenId,
      targetType: 'token',
      targetId: tokenId,
      description: 'Revoked access token manually.',
      req: request
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
