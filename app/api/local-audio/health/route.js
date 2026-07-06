import { NextResponse } from 'next/server';
import { localAudioHealth, resolveLocalAudioHostFromEnv } from '@/src/lib/providers/localAudioShared';
import { getProviderCredentialsForApi } from '@/src/lib/db/providerCredentials';

export const runtime = 'nodejs';

async function resolveHost(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('host')) return searchParams.get('host');
  const global = await getProviderCredentialsForApi('_global', 'local_audio');
  if (global?.base_url) return global.base_url;
  return resolveLocalAudioHostFromEnv();
}

export async function GET(request) {
  try {
    const host = await resolveHost(request);
    const health = await localAudioHealth(host);
    return NextResponse.json({ ok: true, ...health });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
