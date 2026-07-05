import { NextResponse } from 'next/server';
import { bootstrapDatabase } from '@/src/lib/db/bootstrap';
import { requireInternalApiKey } from '@/src/lib/server/internalAuth';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const auth = await requireInternalApiKey(request);
    if (!auth.ok) return auth.response;

    const result = await bootstrapDatabase();
    return NextResponse.json({
      ok: true,
      database: 'genai',
      ...result,
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
