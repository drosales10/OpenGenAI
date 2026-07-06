import { NextResponse } from 'next/server';
import { probeWan2gp, resolveWan2gpHostFromEnv } from '@/src/lib/providers/wan2gpShared';
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
    const health = await probeWan2gp(host);
    return NextResponse.json({ ok: true, ...health });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
