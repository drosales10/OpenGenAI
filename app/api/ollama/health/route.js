import { NextResponse } from 'next/server';
import { ollamaHealth, resolveOllamaHostFromEnv } from '@/src/lib/providers/ollamaShared';
import { getProviderCredentialsForApi } from '@/src/lib/db/providerCredentials';

export const runtime = 'nodejs';

async function resolveHost(request) {
  const { searchParams } = new URL(request.url);
  const queryHost = searchParams.get('host');
  if (queryHost) return queryHost;

  const global = await getProviderCredentialsForApi('_global', 'ollama');
  if (global?.base_url) return global.base_url;

  return resolveOllamaHostFromEnv();
}

export async function GET(request) {
  try {
    const host = await resolveHost(request);
    const health = await ollamaHealth(host);
    return NextResponse.json({ ok: true, ...health });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
