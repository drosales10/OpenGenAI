import { getProviderCredentialsForApi } from '@/src/lib/db/providerCredentials';
import { resolveFalApiKeyFromEnv } from '@/src/lib/providers/falShared';

const FAL_BACKED_PROVIDER_IDS = new Set([
  'kling',
  'minimax',
  'bytedance',
  'wan',
  'runway',
  'suno',
]);

export function isFalBackedProvider(providerId) {
  return FAL_BACKED_PROVIDER_IDS.has(providerId);
}

export async function resolveFalBackedCredentials(providerId, modelKey, moduleId) {
  if (!isFalBackedProvider(providerId)) return null;

  const falEnvKey = resolveFalApiKeyFromEnv();
  if (falEnvKey) {
    return {
      source: 'env_fal',
      provider: providerId,
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
      provider: providerId,
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
      provider: providerId,
      modelKey,
      moduleId,
      apiKey: falGlobal.api_key,
      baseUrl: falGlobal.base_url || null,
      routingMode: 'auto',
    };
  }

  return null;
}
