import { NextResponse } from 'next/server';
import { logAuditEvent, AuditAction } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const { userId, userRole, action, description } = await request.json();

    if (!userId || !userRole || !action) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    await logAuditEvent({
      userId,
      userRole,
      action: action as AuditAction,
      targetType: 'system',
      description: description || 'User logged in',
      req: request
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
