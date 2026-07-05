import { NextResponse } from 'next/server';
import { requireInternalApiKey } from '@/src/lib/server/internalAuth';
import { getMuapiProviderConfig, upsertMuapiProviderConfig } from '@/src/lib/db/providers';
import { upsertProviderCredentials } from '@/src/lib/db/providerCredentials';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const auth = await requireInternalApiKey(request);
    if (!auth.ok) return auth.response;

    const config = await getMuapiProviderConfig();
    return NextResponse.json({
      ok: true,
      configured: Boolean(config.apiKey),
      base_url: config.baseUrl,
      key_preview: config.apiKey ? `${config.apiKey.slice(0, 6)}...${config.apiKey.slice(-4)}` : null,
      updated_at: config.updatedAt,
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

export async function POST(request) {
  try {
    const auth = await requireInternalApiKey(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const result = await upsertMuapiProviderConfig({
      apiKey: body.api_key,
      baseUrl: body.base_url,
    });

    if (body.api_key) {
      await upsertProviderCredentials({
        moduleId: '_global',
        providerId: 'muapi',
        credentials: {
          api_key: String(body.api_key || '').trim(),
          base_url: body.base_url || result.baseUrl,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      configured: result.configured,
      base_url: result.baseUrl,
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
