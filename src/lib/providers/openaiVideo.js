/**
 * Adaptador OpenAI — Sora 2 / Sora 2 Pro (text-to-video, image-to-video).
 * @see https://developers.openai.com/api/docs/guides/video-generation
 */

import {
  OPENAI_API_BASE,
  openaiHeaders,
  parseOpenAIError,
  fetchAsBlob,
  buildOpenAIVideoProxyUrl,
} from '@/src/lib/providers/openaiShared';

const VIDEO_KINDS = new Set(['t2v', 'i2v', 'v2v']);

const APP_TO_SORA_MODEL = {
  'openai-sora': 'sora-2',
  'openai-sora-2-text-to-video': 'sora-2',
  'openai-sora-2-pro-text-to-video': 'sora-2-pro',
  'openai-sora-2-image-to-video': 'sora-2',
  'openai-sora-2-pro-image-to-video': 'sora-2-pro',
};

function resolveSoraApiModel(modelId) {
  if (APP_TO_SORA_MODEL[modelId]) return APP_TO_SORA_MODEL[modelId];
  const id = String(modelId || '').toLowerCase();
  if (id.includes('pro')) return 'sora-2-pro';
  if (id.includes('sora')) return 'sora-2';
  return null;
}

export function isOpenAIVideoModel(modelContext) {
  if (!modelContext) return false;
  if (!VIDEO_KINDS.has(modelContext.kind)) return false;
  const id = String(modelContext.id || modelContext.endpoint || '').toLowerCase();
  return /sora|openai.*video/.test(id);
}

function normalizeDurationSeconds(duration, modelId) {
  const parsed = Number.parseInt(String(duration ?? ''), 10);
  const isPro = String(modelId).includes('pro');

  if (Number.isFinite(parsed)) {
    if ([4, 5, 6, 8, 10, 12, 15, 16, 20, 25].includes(parsed)) return String(parsed);
  }

  if (isPro) return '10';
  return '10';
}

function resolveSoraSize(aspectRatio, resolution, modelId) {
  const aspect = String(aspectRatio || '16:9').trim();
  const res = String(resolution || '720p').trim().toLowerCase();
  const isPro = String(modelId).includes('pro') || resolveSoraApiModel(modelId) === 'sora-2-pro';

  if (aspect === '1:1') {
    if (res === '1080p') return '1080x1080';
    return '720x720';
  }

  if (aspect === '9:16') {
    if (res === '1080p' && isPro) return '1080x1920';
    if (res === '480p') return '480x854';
    return '720x1280';
  }

  if (res === '1080p' && isPro) return '1920x1080';
  if (res === '480p') return '854x480';
  return '1280x720';
}

function collectReferenceImages(payload, modelContext) {
  if (/reference/.test(modelContext.id || '')) return [];
  const images = Array.isArray(payload.images_list) ? payload.images_list : [];
  if (images.length) return images;
  if (payload.image_url) return [payload.image_url];
  return [];
}

async function startSoraVideoJob(apiModel, payload, modelContext, apiKey) {
  const size = resolveSoraSize(payload.aspect_ratio, payload.resolution, modelContext.id);
  const seconds = normalizeDurationSeconds(payload.duration, modelContext.id);
  const prompt = payload.prompt?.trim();
  const referenceImages = collectReferenceImages(payload, modelContext);

  if (!prompt && !referenceImages.length) {
    throw new Error('Se requiere un prompt o imagen para generar el video');
  }

  let response;

  if (referenceImages.length > 0) {
    const form = new FormData();
    form.append('model', apiModel);
    if (prompt) form.append('prompt', prompt);
    form.append('size', size);
    form.append('seconds', seconds);

    const blob = await fetchAsBlob(referenceImages[0]);
    if (!blob) throw new Error('No se pudo cargar la imagen de referencia para Sora');
    form.append('input_reference', blob, 'reference.png');

    response = await fetch(`${OPENAI_API_BASE}/videos`, {
      method: 'POST',
      headers: openaiHeaders(apiKey, null),
      body: form,
    });
  } else {
    response = await fetch(`${OPENAI_API_BASE}/videos`, {
      method: 'POST',
      headers: openaiHeaders(apiKey),
      body: JSON.stringify({
        model: apiModel,
        prompt,
        size,
        seconds,
      }),
    });
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw parseOpenAIError(data, response.status, `Sora/${apiModel}`);

  if (!data.id) throw new Error(`Sora/${apiModel} no devolvió id de video`);
  return { videoId: data.id, size, seconds, apiModel };
}

async function pollSoraVideo(videoId, apiKey, maxAttempts = 120) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, 10000));

    const response = await fetch(`${OPENAI_API_BASE}/videos/${videoId}`, {
      headers: openaiHeaders(apiKey, null),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw parseOpenAIError(data, response.status, 'Sora poll');

    if (data.status === 'completed') return data;
    if (data.status === 'failed') {
      const message = data.error?.message || 'Generación de video fallida';
      throw new Error(`Sora: ${message}`);
    }
  }

  throw new Error('Sora: tiempo de espera agotado (la generación puede tardar varios minutos)');
}

export async function generateOpenAIVideo(modelContext, payload, apiKey) {
  const trimmedKey = String(apiKey || '').trim();
  if (!trimmedKey) throw new Error('Clave de OpenAI no configurada');

  const modelId = modelContext.id;
  const apiModel = resolveSoraApiModel(modelId);
  if (!apiModel) throw new Error(`Modelo Sora no soportado: ${modelId}`);

  const { videoId, size, seconds } = await startSoraVideoJob(
    apiModel,
    payload,
    modelContext,
    trimmedKey
  );

  await pollSoraVideo(videoId, trimmedKey);

  const endpoint = modelContext.endpoint || modelId;
  return {
    url: buildOpenAIVideoProxyUrl(videoId, endpoint),
    status: 'completed',
    provider: 'openai',
    model: modelId,
    openai_api_model: apiModel,
    openai_video_id: videoId,
    sora_size: size,
    sora_seconds: seconds,
  };
}
