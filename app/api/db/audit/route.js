import { NextResponse } from 'next/server';
import { requireInternalApiKey } from '@/src/lib/server/internalAuth';
import { listAdminAuditLogs } from '@/src/lib/db/adminAudit';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const auth = await requireInternalApiKey(request);
    if (!auth.ok) return auth.response;

    if (auth.auth?.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Admin role required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') || 50);
    const logs = await listAdminAuditLogs({ limit });

    return NextResponse.json({
      ok: true,
      logs,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
