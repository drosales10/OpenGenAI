import { NextResponse } from 'next/server';
import { requireInternalApiKey } from '@/src/lib/server/internalAuth';
import { resolveApiKeyForRouteGroup } from '@/src/lib/db/providerCredentials';
import { findUserByInternalApiKey } from '@/src/lib/db/apiKeys';

async function resolveProviderApiKey(routeGroup = 'generation') {
  const resolved = await resolveApiKeyForRouteGroup(routeGroup);
  if (!resolved?.apiKey) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: 'API key is not configured for this module. Configure it in Settings → API Keys.',
        },
        { status: 412 }
      ),
    };
  }

  return { ok: true, providerKey: resolved.apiKey, baseUrl: resolved.baseUrl, source: resolved.source };
}

export async function resolveMuapiProxyAuth(request, legacyResolver, routeGroup = 'generation') {
  const internalKey = request.headers.get('x-internal-api-key');
  if (internalKey) {
    const auth = await requireInternalApiKey(request);
    if (!auth.ok) {
      return {
        ok: false,
        response: auth.response,
      };
    }

    const provider = await resolveProviderApiKey(routeGroup);
    if (!provider.ok) return provider;

    return {
      ok: true,
      apiKey: provider.providerKey,
      baseUrl: provider.baseUrl,
      authMode: 'internal',
      userId: auth.auth?.user_id || null,
      keySource: provider.source,
    };
  }

  const internalCookie = request.cookies.get('internal_api_key')?.value;
  if (internalCookie) {
    const user = await findUserByInternalApiKey(internalCookie);
    if (!user) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            ok: false,
            error: 'Invalid internal API key cookie',
          },
          { status: 403 }
        ),
      };
    }

    const provider = await resolveProviderApiKey(routeGroup);
    if (!provider.ok) return provider;

    return {
      ok: true,
      apiKey: provider.providerKey,
      baseUrl: provider.baseUrl,
      authMode: 'internal-cookie',
      userId: user.user_id || null,
      keySource: provider.source,
    };
  }

  const legacyKey = legacyResolver ? legacyResolver(request) : '';
  if (!legacyKey) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: 'Missing API key',
        },
        { status: 401 }
      ),
    };
  }

  return {
    ok: true,
    apiKey: legacyKey,
    baseUrl: 'https://api.muapi.ai',
    authMode: 'legacy',
    userId: null,
    keySource: 'client',
  };
}
