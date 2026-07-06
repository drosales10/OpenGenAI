import { NextResponse } from 'next/server';
import { uploadFileToWan2gp } from '@/src/lib/providers/wan2gp';
import { resolveWan2gpHostFromEnv } from '@/src/lib/providers/wan2gpShared';
import { getProviderCredentialsForApi } from '@/src/lib/db/providerCredentials';

export const runtime = 'nodejs';

async function resolveHost() {
  const global = await getProviderCredentialsForApi('_global', 'wan2gp');
  return global?.base_url || resolveWan2gpHostFromEnv();
}

export async function POST(request) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ ok: false, error: 'file required' }, { status: 400 });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const host = await resolveHost();
    const result = await uploadFileToWan2gp(host, {
      name: file.name,
      type: file.type,
      bytes,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
