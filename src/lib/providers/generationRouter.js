import { findModelContext } from '@/src/lib/modelRegistry';
import {
  resolveCredentialsForModel,
  shouldUseDirectProvider,
} from '@/src/lib/db/modelCredentials';
import { generateGoogleImage, isGoogleImageModel } from '@/src/lib/providers/google';
import { generateGoogleVideo, isGoogleVideoModel } from '@/src/lib/providers/googleVideo';

const MUAPI_BASE = 'https://api.muapi.ai';

async function pollMuapiResult(requestId, apiKey, maxAttempts = 120, interval = 2000) {
  const pollUrl = `${MUAPI_BASE}/api/v1/predictions/${requestId}/result`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, interval));
    const response = await fetch(pollUrl, {
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    });

    if (!response.ok) {
      if (response.status >= 500) continue;
      const errText = await response.text();
      throw new Error(`Poll Failed: ${response.status} - ${errText.slice(0, 120)}`);
    }

    const data = await response.json();
    const status = data.status?.toLowerCase();
    if (status === 'completed' || status === 'succeeded' || status === 'success') {
      const outputUrl = data.outputs?.[0] || data.url || data.output?.url;
      return { ...data, url: outputUrl, status: 'completed' };
    }
    if (status === 'failed' || status === 'error') {
      throw new Error(data.error || 'Generation failed');
    }
  }

  throw new Error('Generation timed out');
}

async function generateViaMuapi(endpoint, payload, apiKey) {
  const url = `${MUAPI_BASE}/api/v1/${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API Request Failed: ${response.status} - ${errText.slice(0, 150)}`);
  }

  const submitData = await response.json();
  const requestId = submitData.request_id || submitData.id;
  if (!requestId) {
    const outputUrl = submitData.outputs?.[0] || submitData.url || submitData.output?.url;
    return { ...submitData, url: outputUrl, status: 'completed' };
  }

  return pollMuapiResult(requestId, apiKey);
}

export async function routeGeneration(endpoint, payload, { legacyApiKey = null } = {}) {
  const modelContext = findModelContext(endpoint);
  const credentials = await resolveCredentialsForModel(endpoint);

  const useDirect = credentials && (await shouldUseDirectProvider(endpoint, credentials));

  if (useDirect && credentials.provider === 'google') {
    if (isGoogleVideoModel(modelContext)) {
      const result = await generateGoogleVideo(modelContext, payload, credentials.apiKey);
      return {
        ...result,
        routing: 'direct',
        provider: 'google',
        credential_source: credentials.source,
      };
    }

    if (isGoogleImageModel(modelContext.id) || ['t2i', 'i2i'].includes(modelContext.kind)) {
      const result = await generateGoogleImage(modelContext, payload, credentials.apiKey);
      return {
        ...result,
        routing: 'direct',
        provider: 'google',
        credential_source: credentials.source,
      };
    }
  }

  const muapiKey = credentials?.provider === 'muapi'
    ? credentials.apiKey
    : (legacyApiKey || credentials?.apiKey);

  if (modelContext.provider === 'google' && (!credentials || credentials.provider === 'muapi')) {
    throw new Error(
      'Configura tu clave de Google AI Studio en Settings → Claves API (modelo Veo/Gemini), '
      + 'o añade GOOGLE_API_KEY en el archivo .env del servidor.'
    );
  }

  if (!muapiKey) {
    throw new Error(
      'No hay clave API configurada para este modelo. Ve a Settings → Claves API y configura tu clave (Google, MuAPI, etc.).'
    );
  }

  const result = await generateViaMuapi(endpoint, payload, muapiKey);
  return {
    ...result,
    routing: 'muapi',
    provider: 'muapi',
    credential_source: credentials?.source || 'legacy_client',
  };
}

export async function getGenerationRoutingInfo(endpoint) {
  const modelContext = findModelContext(endpoint);
  const credentials = await resolveCredentialsForModel(endpoint);
  const useDirect = credentials && (await shouldUseDirectProvider(endpoint, credentials));

  return {
    model_key: modelContext.id,
    model_name: modelContext.name,
    provider_id: modelContext.provider,
    module_id: modelContext.moduleId,
    configured: Boolean(credentials?.apiKey),
    routing: useDirect ? 'direct' : credentials ? 'muapi' : 'none',
    credential_source: credentials?.source || null,
    supports_direct:
      modelContext.provider === 'google'
      && (isGoogleImageModel(modelContext.id) || isGoogleVideoModel(modelContext)),
  };
}
