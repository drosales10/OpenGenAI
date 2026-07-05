import { buildInternalApiUrl, getInternalApiKey } from './internalApi.js';

/**
 * Sincroniza la clave MuAPI del cliente hacia PostgreSQL (provider _global).
 * Silencioso si no hay clave interna configurada.
 */
export async function syncMuapiKeyToBackend(muapiKey, { baseUrl = 'https://api.muapi.ai' } = {}) {
  const trimmed = String(muapiKey || '').trim();
  const internalKey = getInternalApiKey();

  if (!internalKey || !trimmed) {
    return { synced: false, reason: internalKey ? 'empty_muapi_key' : 'no_internal_key' };
  }

  const response = await fetch(buildInternalApiUrl('/api/providers/muapi/key'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-api-key': internalKey,
    },
    body: JSON.stringify({
      api_key: trimmed,
      base_url: baseUrl,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return { synced: true, configured: Boolean(data.configured), base_url: data.base_url };
}
