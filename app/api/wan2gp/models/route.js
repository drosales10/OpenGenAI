import { NextResponse } from 'next/server';
import { listWan2gpModels, resolveWan2gpHostFromEnv } from '@/src/lib/providers/wan2gpShared';
import { getProviderCredentialsForApi } from '@/src/lib/db/providerCredentials';

export const runtime = 'nodejs';

async function resolveHost(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('host')) return searchParams.get('host');
  const global = await getProviderCredentialsForApi('_global', 'wan2gp');
  if (global?.base_url) return global.base_url;
  return resolveWan2gpHostFromEnv();
}

export async function GET(request) {
  try {
    const host = await resolveHost(request);
    const models = await listWan2gpModels(host);
    return NextResponse.json({ ok: true, host, models });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 503 });
  }
}
