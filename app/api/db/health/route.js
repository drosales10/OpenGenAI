import { NextResponse } from 'next/server';
import { getDatabaseHealth } from '@/src/lib/postgres';
import { requireInternalApiKey } from '@/src/lib/server/internalAuth';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const hasApiKey = Boolean(request.headers.get('x-internal-api-key') || request.headers.get('authorization'));
    if (hasApiKey) {
      const auth = await requireInternalApiKey(request);
      if (!auth.ok) return auth.response;
    }

    const db = await getDatabaseHealth();
    return NextResponse.json({
      ok: true,
      database: db?.database_name || 'genai',
      schema: db?.schema_name || 'public',
      server_time: db?.server_time || null,
    });
  } catch (error) {
    if (/DATABASE_URL is required/.test(error.message)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'DATABASE_URL is not configured',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}