import { getSetting, upsertSetting } from '@/src/lib/db/settings';

const MUAPI_SETTING_KEY = 'provider_muapi';

export async function getMuapiProviderConfig() {
  const setting = await getSetting(MUAPI_SETTING_KEY);
  const value = setting?.setting_value || {};

  return {
    apiKey: value.api_key || '',
    baseUrl: value.base_url || 'https://api.muapi.ai',
    updatedAt: setting?.updated_at || null,
  };
}

export async function upsertMuapiProviderConfig({ apiKey, baseUrl }) {
  const current = await getMuapiProviderConfig();
  const next = {
    api_key: apiKey !== undefined ? String(apiKey || '').trim() : current.apiKey,
    base_url: baseUrl !== undefined ? String(baseUrl || '').trim() : current.baseUrl,
  };

  await upsertSetting(MUAPI_SETTING_KEY, next);
  return {
    configured: Boolean(next.api_key),
    baseUrl: next.base_url || 'https://api.muapi.ai',
  };
}
