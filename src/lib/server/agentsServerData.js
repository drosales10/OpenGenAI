import { cookies } from 'next/headers';
import { findUserByInternalApiKey } from '@/src/lib/db/apiKeys';
import { resolveApiKeyForRouteGroup } from '@/src/lib/db/providerCredentials';

const MUAPI_BASE = 'https://api.muapi.ai';

/**
 * Resuelve la clave MuAPI en el servidor para páginas /agents/*.
 * Orden: cookie muapi_key → cookie internal_api_key + credenciales DB → null
 */
export async function resolveServerMuapiKey(routeGroup = 'agents') {
  const cookieStore = await cookies();
  const muapiCookie = cookieStore.get('muapi_key')?.value;
  if (muapiCookie) return muapiCookie;

  let internalCookie = cookieStore.get('internal_api_key')?.value;
  if (!internalCookie) return null;

  try {
    internalCookie = decodeURIComponent(internalCookie);
  } catch {
    // usar valor crudo
  }

  const user = await findUserByInternalApiKey(internalCookie);
  if (!user) return null;

  const resolved = await resolveApiKeyForRouteGroup(routeGroup);
  return resolved?.apiKey || null;
}

async function muapiFetch(path, apiKey) {
  if (!apiKey) return null;
  try {
    const res = await fetch(`${MUAPI_BASE}${path}`, {
      cache: 'no-store',
      headers: { 'x-api-key': apiKey },
    });
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

export async function fetchAgentDetailsServer(agentId, apiKey) {
  if (!apiKey) return null;

  const bySlug = await muapiFetch(`/agents/by-slug/${agentId}`, apiKey);
  if (bySlug) return bySlug;

  if (agentId.length > 20) {
    return muapiFetch(`/agents/${agentId}`, apiKey);
  }
  return null;
}

export async function fetchConversationHistoryServer(agentId, conversationId, apiKey) {
  if (!apiKey) return null;

  const bySlug = await muapiFetch(
    `/agents/by-slug/${agentId}/${conversationId}`,
    apiKey
  );
  if (bySlug) return bySlug;

  if (agentId.length > 20) {
    return muapiFetch(`/agents/${agentId}/${conversationId}`, apiKey);
  }
  return null;
}

export async function fetchMuapiAccountServer(apiKey) {
  if (!apiKey) return null;
  return muapiFetch('/api/v1/account/balance', apiKey);
}
