import { query } from '@/src/lib/postgres';
import { getMuapiProviderConfig } from '@/src/lib/db/providers';
import { resolveModuleForRouteGroup, getModuleById } from '@/src/lib/providerCatalog';

function isMissingTableError(error, tableName) {
  return error?.code === '42P01' && String(error?.message || '').includes(tableName);
}

function maskSecret(value) {
  if (!value || typeof value !== 'string') return null;
  if (value.length <= 10) return '••••••••';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function normalizeCredentials(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const [key, val] of Object.entries(raw)) {
    if (val !== undefined && val !== null) {
      out[key] = String(val).trim();
    }
  }
  return out;
}

export async function listProviderCredentials() {
  try {
    const result = await query(
      `SELECT id, module_id, provider_id, credentials, is_active, updated_at
       FROM provider_credentials
       ORDER BY module_id, provider_id`
    );
    return result.rows.map((row) => ({
      id: Number(row.id),
      module_id: row.module_id,
      provider_id: row.provider_id,
      configured: Boolean(row.credentials?.api_key),
      credentials_preview: Object.fromEntries(
        Object.entries(row.credentials || {}).map(([k, v]) => [
          k,
          k.includes('key') || k.includes('token') || k.includes('secret') ? maskSecret(v) : v,
        ])
      ),
      is_active: row.is_active,
      updated_at: row.updated_at,
    }));
  } catch (error) {
    if (isMissingTableError(error, 'provider_credentials')) return [];
    throw error;
  }
}

export async function getProviderCredentials(moduleId, providerId) {
  try {
    const result = await query(
      `SELECT id, module_id, provider_id, credentials, is_active, updated_at
       FROM provider_credentials
       WHERE module_id = $1 AND provider_id = $2`,
      [moduleId, providerId]
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: Number(row.id),
      module_id: row.module_id,
      provider_id: row.provider_id,
      credentials: row.credentials || {},
      is_active: row.is_active,
      updated_at: row.updated_at,
    };
  } catch (error) {
    if (isMissingTableError(error, 'provider_credentials')) return null;
    throw error;
  }
}

export async function getProviderCredentialsForApi(moduleId, providerId) {
  const row = await getProviderCredentials(moduleId, providerId);
  if (!row || !row.is_active) return null;
  return normalizeCredentials(row.credentials);
}

export async function upsertProviderCredentials({ moduleId, providerId, credentials, isActive = true }) {
  const normalized = normalizeCredentials(credentials);
  const existing = await getProviderCredentials(moduleId, providerId);

  const merged = { ...(existing?.credentials || {}) };
  for (const [key, val] of Object.entries(normalized)) {
    if (val) merged[key] = val;
  }

  const result = await query(
    `INSERT INTO provider_credentials (module_id, provider_id, credentials, is_active)
     VALUES ($1, $2, $3::jsonb, $4)
     ON CONFLICT (module_id, provider_id)
     DO UPDATE SET
       credentials = EXCLUDED.credentials,
       is_active = EXCLUDED.is_active,
       updated_at = now()
     RETURNING id, module_id, provider_id, credentials, is_active, updated_at`,
    [moduleId, providerId, JSON.stringify(merged), isActive]
  );

  const row = result.rows[0];
  return {
    id: Number(row.id),
    module_id: row.module_id,
    provider_id: row.provider_id,
    configured: Boolean(row.credentials?.api_key),
    credentials_preview: Object.fromEntries(
      Object.entries(row.credentials || {}).map(([k, v]) => [
        k,
        k.includes('key') || k.includes('token') || k.includes('secret') ? maskSecret(v) : v,
      ])
    ),
    is_active: row.is_active,
    updated_at: row.updated_at,
  };
}

export async function deleteProviderCredentials(moduleId, providerId) {
  const result = await query(
    `DELETE FROM provider_credentials
     WHERE module_id = $1 AND provider_id = $2
     RETURNING id`,
    [moduleId, providerId]
  );
  return result.rowCount > 0;
}

/**
 * Resuelve la clave API para un route_group del proxy.
 * Orden: módulo específico → global → legacy system_settings
 */
export async function resolveApiKeyForRouteGroup(routeGroup, providerId = 'muapi') {
  const moduleId = resolveModuleForRouteGroup(routeGroup);

  const moduleCreds = await getProviderCredentialsForApi(moduleId, providerId);
  if (moduleCreds?.api_key) {
    return {
      apiKey: moduleCreds.api_key,
      baseUrl: moduleCreds.base_url || 'https://api.muapi.ai',
      source: `module:${moduleId}`,
    };
  }

  const globalCreds = await getProviderCredentialsForApi('_global', providerId);
  if (globalCreds?.api_key) {
    return {
      apiKey: globalCreds.api_key,
      baseUrl: globalCreds.base_url || 'https://api.muapi.ai',
      source: 'global',
    };
  }

  const legacy = await getMuapiProviderConfig();
  if (legacy.apiKey) {
    return {
      apiKey: legacy.apiKey,
      baseUrl: legacy.baseUrl || 'https://api.muapi.ai',
      source: 'legacy_settings',
    };
  }

  return null;
}

export async function getModuleCredentialsStatus(moduleId) {
  const mod = getModuleById(moduleId);
  if (!mod) return { module_id: moduleId, providers: [] };

  const providers = await Promise.all(
    mod.providers.map(async (providerId) => {
      const stored = await getProviderCredentials(moduleId, providerId);
      const creds = stored?.credentials || {};
      return {
        provider_id: providerId,
        configured: Boolean(creds.api_key) || providerId === 'local',
        is_active: stored?.is_active ?? true,
        credentials_preview: Object.fromEntries(
          Object.entries(creds).map(([k, v]) => [
            k,
            k.includes('key') || k.includes('token') || k.includes('secret') ? maskSecret(v) : v,
          ])
        ),
        updated_at: stored?.updated_at || null,
      };
    })
  );

  return { module_id: moduleId, providers };
}
