import { NextResponse } from 'next/server';
import { buildSubstitutesResponse } from '@/src/lib/ollamaSubstitutes';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'es';
    return NextResponse.json({ ok: true, ...buildSubstitutesResponse(lang) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
