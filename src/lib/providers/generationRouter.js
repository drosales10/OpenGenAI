import { findModelContext } from '@/src/lib/modelRegistry';
import {
  resolveCredentialsForModel,
  shouldUseDirectProvider,
} from '@/src/lib/db/modelCredentials';
import { generateGoogleImage, isGoogleImageModel } from '@/src/lib/providers/google';
import { generateGoogleVideo, isGoogleVideoModel } from '@/src/lib/providers/googleVideo';
import { generateOpenAIImage, isOpenAIImageModel } from '@/src/lib/providers/openai';
import { generateOpenAIVideo, isOpenAIVideoModel } from '@/src/lib/providers/openaiVideo';
import { generateFalImage, isFalModel } from '@/src/lib/providers/fal';
import { generateIdeogramImage, isIdeogramModel } from '@/src/lib/providers/ideogram';
import { generateFalVideo, isFalVideoModel } from '@/src/lib/providers/falVideo';
import { generateFalWanImage, isFalWanImageModel } from '@/src/lib/providers/falWanImage';
import { generateReplicateImage, isReplicateModel } from '@/src/lib/providers/replicate';
import { generateFalAudio, isSunoModel } from '@/src/lib/providers/falAudio';
import { generateOllamaImage, isOllamaModel } from '@/src/lib/providers/ollama';
import { resolveOllamaHostFromEnv } from '@/src/lib/providers/ollamaShared';
import { generateWan2gp, isWan2gpModel } from '@/src/lib/providers/wan2gp';
import { resolveWan2gpHostFromEnv } from '@/src/lib/providers/wan2gpShared';
import { generateLocalAudio, isLocalAudioModel } from '@/src/lib/providers/localAudio';
import { resolveLocalAudioHostFromEnv } from '@/src/lib/providers/localAudioShared';
import { generateXtts, isLocalTtsModel } from '@/src/lib/providers/xtts';
import { generateComfyui, isComfyuiModel } from '@/src/lib/providers/comfyui';
import { resolveComfyuiHostFromEnv } from '@/src/lib/providers/comfyuiShared';

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

  if (useDirect && credentials.provider === 'openai') {
    if (isOpenAIVideoModel(modelContext)) {
      const result = await generateOpenAIVideo(modelContext, payload, credentials.apiKey);
      return {
        ...result,
        routing: 'direct',
        provider: 'openai',
        credential_source: credentials.source,
      };
    }

    if (isOpenAIImageModel(modelContext)) {
      const result = await generateOpenAIImage(modelContext, payload, credentials.apiKey);
      return {
        ...result,
        routing: 'direct',
        provider: 'openai',
        credential_source: credentials.source,
      };
    }
  }

  if (useDirect && credentials.provider === 'fal' && isFalModel(modelContext)) {
    const result = await generateFalImage(modelContext, payload, credentials.apiKey);
    return {
      ...result,
      routing: 'direct',
      provider: 'fal',
      credential_source: credentials.source,
    };
  }

  if (useDirect && credentials.provider === 'ideogram' && isIdeogramModel(modelContext)) {
    const result = await generateIdeogramImage(modelContext, payload, credentials.apiKey);
    return {
      ...result,
      routing: 'direct',
      provider: 'ideogram',
      credential_source: credentials.source,
    };
  }

  if (
    useDirect
    && ['kling', 'minimax', 'bytedance', 'wan', 'runway'].includes(credentials.provider)
    && isFalVideoModel(modelContext)
  ) {
    const result = await generateFalVideo(modelContext, payload, credentials.apiKey);
    return {
      ...result,
      routing: 'direct',
      provider: modelContext.provider,
      credential_source: credentials.source,
    };
  }

  if (useDirect && credentials.provider === 'wan' && isFalWanImageModel(modelContext)) {
    const result = await generateFalWanImage(modelContext, payload, credentials.apiKey);
    return {
      ...result,
      routing: 'direct',
      provider: 'wan',
      credential_source: credentials.source,
    };
  }

  if (useDirect && credentials.provider === 'replicate' && isReplicateModel(modelContext)) {
    const useFalFallback = String(credentials.source || '').includes('fal');
    const result = await generateReplicateImage(
      modelContext,
      payload,
      credentials.apiKey,
      { useFalFallback }
    );
    return {
      ...result,
      routing: 'direct',
      provider: 'replicate',
      credential_source: credentials.source,
    };
  }

  if (useDirect && credentials.provider === 'suno' && isSunoModel(modelContext)) {
    const result = await generateFalAudio(modelContext, payload, credentials.apiKey);
    return {
      ...result,
      routing: 'direct',
      provider: 'suno',
      credential_source: credentials.source,
    };
  }

  if (useDirect && credentials.provider === 'ollama' && isOllamaModel(modelContext)) {
    const host = credentials.baseUrl || resolveOllamaHostFromEnv();
    const result = await generateOllamaImage(modelContext, payload, host);
    return {
      ...result,
      routing: 'direct',
      provider: 'ollama',
      credential_source: credentials.source,
    };
  }

  if (useDirect && credentials.provider === 'wan2gp' && isWan2gpModel(modelContext)) {
    const host = credentials.baseUrl || resolveWan2gpHostFromEnv();
    const result = await generateWan2gp(modelContext, payload, host);
    return {
      ...result,
      routing: 'direct',
      provider: 'wan2gp',
      credential_source: credentials.source,
    };
  }

  if (useDirect && credentials.provider === 'local_audio' && isLocalTtsModel(modelContext)) {
    const host = credentials.baseUrl || resolveLocalAudioHostFromEnv();
    const result = await generateXtts(modelContext, payload, host);
    return {
      ...result,
      routing: 'direct',
      provider: 'local_audio',
      credential_source: credentials.source,
    };
  }

  if (useDirect && credentials.provider === 'local_audio' && isLocalAudioModel(modelContext)) {
    const host = credentials.baseUrl || resolveLocalAudioHostFromEnv();
    const result = await generateLocalAudio(modelContext, payload, host);
    return {
      ...result,
      routing: 'direct',
      provider: 'local_audio',
      credential_source: credentials.source,
    };
  }

  if (useDirect && credentials.provider === 'comfyui' && isComfyuiModel(modelContext)) {
    const host = credentials.baseUrl || resolveComfyuiHostFromEnv();
    const result = await generateComfyui(modelContext, payload, host);
    return {
      ...result,
      routing: 'direct',
      provider: 'comfyui',
      credential_source: credentials.source,
    };
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

  if (modelContext.provider === 'openai' && (!credentials || credentials.provider === 'muapi')) {
    throw new Error(
      'Configura tu clave de OpenAI en Settings → Claves API (GPT Image / Sora), '
      + 'o añade OPENAI_API_KEY en el archivo .env del servidor.'
    );
  }

  if (modelContext.provider === 'fal' && isFalModel(modelContext) && (!credentials || credentials.provider === 'muapi')) {
    throw new Error(
      'Configura tu clave de fal.ai en Settings → Claves API (Flux), '
      + 'o añade FAL_KEY en el archivo .env del servidor.'
    );
  }

  if (modelContext.provider === 'ideogram' && isIdeogramModel(modelContext) && (!credentials || credentials.provider === 'muapi')) {
    throw new Error(
      'Configura tu clave de Ideogram en Settings → Claves API, '
      + 'o añade IDEOGRAM_API_KEY en el archivo .env del servidor.'
    );
  }

  const falVideoProviders = ['kling', 'minimax', 'bytedance', 'wan', 'runway'];
  if (
    falVideoProviders.includes(modelContext.provider)
    && isFalVideoModel(modelContext)
    && (!credentials || credentials.provider === 'muapi')
  ) {
    throw new Error(
      `Configura FAL_KEY en .env o tu clave fal.ai en Settings → Claves API (proveedor fal) `
      + `para usar ${modelContext.provider} sin MuAPI.`
    );
  }

  if (
    modelContext.provider === 'wan'
    && isFalWanImageModel(modelContext)
    && (!credentials || credentials.provider === 'muapi')
  ) {
    throw new Error(
      'Configura FAL_KEY en .env o tu clave fal.ai en Settings para Wan imagen sin MuAPI.'
    );
  }

  if (
    modelContext.provider === 'replicate'
    && isReplicateModel(modelContext)
    && (!credentials || credentials.provider === 'muapi')
  ) {
    throw new Error(
      'Configura REPLICATE_API_TOKEN o FAL_KEY en .env para SDXL sin MuAPI.'
    );
  }

  if (
    modelContext.provider === 'suno'
    && isSunoModel(modelContext)
    && (!credentials || credentials.provider === 'muapi')
  ) {
    throw new Error(
      'Configura FAL_KEY en .env para música (Suno vía sonauto/MiniMax Music en fal) sin MuAPI.'
    );
  }

  if (
    modelContext.provider === 'ollama'
    && isOllamaModel(modelContext)
    && (!credentials || !credentials.baseUrl)
  ) {
    throw new Error(
      'Ollama no está configurado. Instala Ollama, ejecuta ollama pull x/flux2-klein:4b '
      + 'y define OLLAMA_HOST en .env o la URL en Settings → Ollama.'
    );
  }

  if (
    modelContext.provider === 'wan2gp'
    && isWan2gpModel(modelContext)
    && (!credentials || !credentials.baseUrl)
  ) {
    throw new Error(
      'Wan2GP no está configurado. Instala Wan2GP, inicia el servidor Gradio '
      + 'y define WAN2GP_URL en .env (ej. http://127.0.0.1:7860) o en Settings.'
    );
  }

  if (
    modelContext.provider === 'local_audio'
    && isLocalTtsModel(modelContext)
    && (!credentials || !credentials.baseUrl)
  ) {
    throw new Error(
      'XTTS no configurado. pip install TTS && python scripts/local_audio_server.py '
      + 'y define LOCAL_AUDIO_HOST en .env.'
    );
  }

  if (
    modelContext.provider === 'local_audio'
    && isLocalAudioModel(modelContext)
    && (!credentials || !credentials.baseUrl)
  ) {
    throw new Error(
      'Audio local no configurado. Ejecuta python scripts/local_audio_server.py '
      + 'y define LOCAL_AUDIO_HOST en .env (ej. http://127.0.0.1:8765).'
    );
  }

  if (
    modelContext.provider === 'comfyui'
    && isComfyuiModel(modelContext)
    && (!credentials || !credentials.baseUrl)
  ) {
    throw new Error(
      'ComfyUI no configurado. Inicia ComfyUI (puerto 8188) y define COMFYUI_URL en .env '
      + 'o la URL en Settings.'
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
      (modelContext.provider === 'google'
        && (isGoogleImageModel(modelContext.id) || isGoogleVideoModel(modelContext)))
      || (modelContext.provider === 'openai'
        && (isOpenAIImageModel(modelContext) || isOpenAIVideoModel(modelContext)))
      || (modelContext.provider === 'fal' && isFalModel(modelContext))
      || (modelContext.provider === 'ideogram' && isIdeogramModel(modelContext))
      || (['kling', 'minimax', 'bytedance', 'wan', 'runway'].includes(modelContext.provider)
        && isFalVideoModel(modelContext))
      || (modelContext.provider === 'wan' && isFalWanImageModel(modelContext))
      || (modelContext.provider === 'replicate' && isReplicateModel(modelContext))
      || (modelContext.provider === 'suno' && isSunoModel(modelContext))
      || (modelContext.provider === 'ollama' && isOllamaModel(modelContext))
      || (modelContext.provider === 'wan2gp' && isWan2gpModel(modelContext))
      || (modelContext.provider === 'local_audio' && isLocalAudioModel(modelContext))
      || (modelContext.provider === 'local_audio' && isLocalTtsModel(modelContext))
      || (modelContext.provider === 'comfyui' && isComfyuiModel(modelContext)),
  };
}
