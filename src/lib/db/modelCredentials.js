import { query } from '@/src/lib/postgres';
import { getProviderCredentialsForApi, resolveApiKeyForRouteGroup } from '@/src/lib/db/providerCredentials';
import { findModelContext } from '@/src/lib/modelRegistry';
import { getProviderMeta } from '@/src/lib/modelProviders';
import { resolveOpenAIApiKeyFromEnv } from '@/src/lib/providers/openaiShared';
import { resolveFalApiKeyFromEnv } from '@/src/lib/providers/falShared';
import { resolveIdeogramApiKeyFromEnv } from '@/src/lib/providers/ideogram';
import { resolveReplicateApiKeyFromEnv } from '@/src/lib/providers/replicate';
import { resolveFalBackedCredentials } from '@/src/lib/db/falBackedCredentials';
import { resolveOllamaHostFromEnv } from '@/src/lib/providers/ollamaShared';
import { resolveWan2gpHostFromEnv } from '@/src/lib/providers/wan2gpShared';
import { resolveLocalAudioHostFromEnv } from '@/src/lib/providers/localAudioShared';
import { resolveComfyuiHostFromEnv } from '@/src/lib/providers/comfyuiShared';

const HOST_ONLY_PROVIDERS = new Set(['ollama', 'wan2gp', 'local_audio', 'comfyui']);

function resolveGoogleApiKeyFromEnv() {
  const key =
    process.env.GOOGLE_API_KEY
    || process.env.GEMINI_API_KEY
    || process.env.GOOGLE_GENAI_API_KEY;
  return key?.trim() || null;
}

function isMissingTableError(error, tableName) {
  return error?.code === '42P01' && String(error?.message || '').includes(tableName);
}

function isHostProviderConfigured(credentials) {
  return Boolean(credentials?.baseUrl);
}

function modelRowConfigured(row) {
  if (!row?.credentials) return false;
  if (HOST_ONLY_PROVIDERS.has(row.provider_id)) {
    return Boolean(row.credentials.base_url);
  }
  return Boolean(row.credentials.api_key);
}

function maskSecret(value) {
  if (!value || typeof value !== 'string') return null;
  if (value.length <= 10) return '••••••••';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export async function getModelCredentials(modelKey) {
  try {
    const result = await query(
      `SELECT model_key, provider_id, module_id, credentials, routing_mode, is_active, updated_at
       FROM model_credentials WHERE model_key = $1`,
      [modelKey]
    );
    return result.rows[0] || null;
  } catch (error) {
    if (isMissingTableError(error, 'model_credentials')) return null;
    throw error;
  }
}

export async function listModelCredentials() {
  try {
    const result = await query(
      `SELECT model_key, provider_id, module_id, credentials, routing_mode, is_active, updated_at
       FROM model_credentials ORDER BY module_id, model_key`
    );
    return result.rows.map((row) => ({
      model_key: row.model_key,
      provider_id: row.provider_id,
      module_id: row.module_id,
      configured: modelRowConfigured(row),
      credentials_preview: {
        api_key: row.credentials?.api_key ? maskSecret(row.credentials.api_key) : null,
        base_url: row.credentials?.base_url || null,
      },
      routing_mode: row.routing_mode,
      is_active: row.is_active,
      updated_at: row.updated_at,
    }));
  } catch (error) {
    if (isMissingTableError(error, 'model_credentials')) return [];
    throw error;
  }
}

export async function upsertModelCredentials({
  modelKey,
  providerId,
  moduleId,
  credentials,
  routingMode = 'auto',
  isActive = true,
}) {
  const creds = {};
  for (const [k, v] of Object.entries(credentials || {})) {
    if (v !== undefined && v !== null && String(v).trim()) {
      creds[k] = String(v).trim();
    }
  }

  const existing = await getModelCredentials(modelKey);
  const merged = { ...(existing?.credentials || {}), ...creds };

  const result = await query(
    `INSERT INTO model_credentials (model_key, provider_id, module_id, credentials, routing_mode, is_active)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6)
     ON CONFLICT (model_key)
     DO UPDATE SET
       provider_id = EXCLUDED.provider_id,
       module_id = EXCLUDED.module_id,
       credentials = EXCLUDED.credentials,
       routing_mode = EXCLUDED.routing_mode,
       is_active = EXCLUDED.is_active,
       updated_at = now()
     RETURNING model_key, provider_id, module_id, credentials, routing_mode, is_active, updated_at`,
    [modelKey, providerId, moduleId, JSON.stringify(merged), routingMode, isActive]
  );

  const row = result.rows[0];
  return {
    model_key: row.model_key,
    provider_id: row.provider_id,
    module_id: row.module_id,
    configured: modelRowConfigured(row),
    credentials_preview: {
      api_key: row.credentials?.api_key ? maskSecret(row.credentials.api_key) : null,
      base_url: row.credentials?.base_url || null,
    },
    routing_mode: row.routing_mode,
    is_active: row.is_active,
    updated_at: row.updated_at,
  };
}

export async function deleteModelCredentials(modelKey) {
  const result = await query(
    `DELETE FROM model_credentials WHERE model_key = $1 RETURNING model_key`,
    [modelKey]
  );
  return result.rowCount > 0;
}

/**
 * Resuelve credenciales para un modelo concreto.
 * Orden: model_credentials → provider module → provider _global → muapi global
 */
export async function resolveGoogleDirectCredentials(endpointOrId) {
  const model = findModelContext(endpointOrId);
  const isGoogle =
    model.provider === 'google'
    || /veo|gemini|imagen|nano-banana/i.test(String(model.id || model.endpoint || ''));

  if (!isGoogle) return null;

  const modelRow = await getModelCredentials(model.id);
  if (
    modelRow?.is_active
    && modelRow.provider_id === 'google'
    && modelRow.credentials?.api_key
  ) {
    return {
      apiKey: modelRow.credentials.api_key,
      source: 'model',
      provider: 'google',
    };
  }

  const moduleProvider = await getProviderCredentialsForApi(model.moduleId, 'google');
  if (moduleProvider?.api_key) {
    return {
      apiKey: moduleProvider.api_key,
      source: 'module_provider',
      provider: 'google',
    };
  }

  const globalProvider = await getProviderCredentialsForApi('_global', 'google');
  if (globalProvider?.api_key) {
    return {
      apiKey: globalProvider.api_key,
      source: 'global_provider',
      provider: 'google',
    };
  }

  const envKey = resolveGoogleApiKeyFromEnv();
  if (envKey) {
    return {
      apiKey: envKey,
      source: 'env',
      provider: 'google',
    };
  }

  return null;
}

export async function resolveCredentialsForModel(endpointOrId) {
  const model = findModelContext(endpointOrId);
  const providerId = model.provider;
  const moduleId = model.moduleId;
  const modelKey = model.id;

  const modelRow = await getModelCredentials(modelKey);
  if (modelRow?.is_active && HOST_ONLY_PROVIDERS.has(modelRow.provider_id) && modelRow.credentials?.base_url) {
    return {
      source: 'model',
      provider: modelRow.provider_id,
      modelKey,
      moduleId: modelRow.module_id || moduleId,
      apiKey: null,
      baseUrl: modelRow.credentials.base_url,
      routingMode: modelRow.routing_mode || 'auto',
    };
  }

  if (modelRow?.is_active && modelRow.credentials?.api_key) {
    return {
      source: 'model',
      provider: modelRow.provider_id || providerId,
      modelKey,
      moduleId: modelRow.module_id || moduleId,
      apiKey: modelRow.credentials.api_key,
      baseUrl: modelRow.credentials.base_url || null,
      routingMode: modelRow.routing_mode || 'auto',
    };
  }

  const moduleProvider = await getProviderCredentialsForApi(moduleId, providerId);
  if (HOST_ONLY_PROVIDERS.has(providerId) && moduleProvider?.base_url) {
    return {
      source: 'module_provider',
      provider: providerId,
      modelKey,
      moduleId,
      apiKey: null,
      baseUrl: moduleProvider.base_url,
      routingMode: 'auto',
    };
  }

  if (moduleProvider?.api_key) {
    return {
      source: 'module_provider',
      provider: providerId,
      modelKey,
      moduleId,
      apiKey: moduleProvider.api_key,
      baseUrl: moduleProvider.base_url || null,
      routingMode: 'auto',
    };
  }

  const globalProvider = await getProviderCredentialsForApi('_global', providerId);
  if (HOST_ONLY_PROVIDERS.has(providerId) && globalProvider?.base_url) {
    return {
      source: 'global_provider',
      provider: providerId,
      modelKey,
      moduleId,
      apiKey: null,
      baseUrl: globalProvider.base_url,
      routingMode: 'auto',
    };
  }

  if (globalProvider?.api_key) {
    return {
      source: 'global_provider',
      provider: providerId,
      modelKey,
      moduleId,
      apiKey: globalProvider.api_key,
      baseUrl: globalProvider.base_url || null,
      routingMode: 'auto',
    };
  }

  if (providerId === 'google') {
    const envKey = resolveGoogleApiKeyFromEnv();
    if (envKey) {
      return {
        source: 'env',
        provider: 'google',
        modelKey,
        moduleId,
        apiKey: envKey,
        baseUrl: null,
        routingMode: 'auto',
      };
    }
  }

  if (providerId === 'openai') {
    const envKey = resolveOpenAIApiKeyFromEnv();
    if (envKey) {
      return {
        source: 'env',
        provider: 'openai',
        modelKey,
        moduleId,
        apiKey: envKey,
        baseUrl: null,
        routingMode: 'auto',
      };
    }
  }

  if (providerId === 'fal') {
    const envKey = resolveFalApiKeyFromEnv();
    if (envKey) {
      return {
        source: 'env',
        provider: 'fal',
        modelKey,
        moduleId,
        apiKey: envKey,
        baseUrl: null,
        routingMode: 'auto',
      };
    }
  }

  if (providerId === 'ideogram') {
    const envKey = resolveIdeogramApiKeyFromEnv();
    if (envKey) {
      return {
        source: 'env',
        provider: 'ideogram',
        modelKey,
        moduleId,
        apiKey: envKey,
        baseUrl: null,
        routingMode: 'auto',
      };
    }
  }

  if (providerId === 'replicate') {
    const repKey = resolveReplicateApiKeyFromEnv();
    if (repKey) {
      return {
        source: 'env',
        provider: 'replicate',
        modelKey,
        moduleId,
        apiKey: repKey,
        baseUrl: null,
        routingMode: 'auto',
      };
    }

    const falEnvKey = resolveFalApiKeyFromEnv();
    if (falEnvKey) {
      return {
        source: 'env_fal',
        provider: 'replicate',
        modelKey,
        moduleId,
        apiKey: falEnvKey,
        baseUrl: null,
        routingMode: 'auto',
      };
    }

    const falModule = await getProviderCredentialsForApi(moduleId, 'fal');
    if (falModule?.api_key) {
      return {
        source: 'fal_module_provider',
        provider: 'replicate',
        modelKey,
        moduleId,
        apiKey: falModule.api_key,
        baseUrl: falModule.base_url || null,
        routingMode: 'auto',
      };
    }

    const falGlobal = await getProviderCredentialsForApi('_global', 'fal');
    if (falGlobal?.api_key) {
      return {
        source: 'fal_global_provider',
        provider: 'replicate',
        modelKey,
        moduleId,
        apiKey: falGlobal.api_key,
        baseUrl: falGlobal.base_url || null,
        routingMode: 'auto',
      };
    }
  }

  if (providerId === 'wan2gp') {
    const envHost = resolveWan2gpHostFromEnv();
    if (envHost) {
      return {
        source: 'env',
        provider: 'wan2gp',
        modelKey,
        moduleId,
        apiKey: null,
        baseUrl: envHost,
        routingMode: 'auto',
      };
    }
  }

  if (providerId === 'comfyui') {
    const envHost = resolveComfyuiHostFromEnv();
    if (envHost) {
      return {
        source: 'env',
        provider: 'comfyui',
        modelKey,
        moduleId,
        apiKey: null,
        baseUrl: envHost,
        routingMode: 'auto',
      };
    }
  }

  if (providerId === 'local_audio') {
    const envHost = resolveLocalAudioHostFromEnv();
    if (envHost) {
      return {
        source: 'env',
        provider: 'local_audio',
        modelKey,
        moduleId,
        apiKey: null,
        baseUrl: envHost,
        routingMode: 'auto',
      };
    }
  }

  if (providerId === 'ollama') {
    const envHost = resolveOllamaHostFromEnv();
    if (envHost) {
      return {
        source: 'env',
        provider: 'ollama',
        modelKey,
        moduleId,
        apiKey: null,
        baseUrl: envHost,
        routingMode: 'auto',
      };
    }
  }

  const falBacked = await resolveFalBackedCredentials(providerId, modelKey, moduleId);
  if (falBacked) return falBacked;

  const directOnlyProviders = new Set([
    'google', 'openai', 'ollama', 'wan2gp', 'local_audio', 'comfyui',
  ]);
  if (directOnlyProviders.has(providerId)) {
    return null;
  }

  const muapi = await resolveApiKeyForRouteGroup('generation', 'muapi');
  if (muapi?.apiKey) {
    return {
      source: muapi.source || 'muapi',
      provider: 'muapi',
      modelKey,
      moduleId,
      apiKey: muapi.apiKey,
      baseUrl: muapi.baseUrl,
      routingMode: 'muapi',
    };
  }

  return null;
}

export async function shouldUseDirectProvider(endpointOrId, credentials) {
  if (credentials?.routingMode === 'muapi') return false;
  if (credentials?.provider === 'muapi') return false;

  const meta = getProviderMeta(credentials?.provider);
  if (!meta.supportsDirect) return false;

  if (HOST_ONLY_PROVIDERS.has(credentials?.provider)) {
    return isHostProviderConfigured(credentials);
  }

  if (!credentials?.apiKey) return false;
  if (credentials.routingMode === 'direct') return true;

  return credentials.source === 'model'
    || credentials.source.includes('provider')
    || credentials.source === 'env'
    || credentials.source === 'env_fal';
}
