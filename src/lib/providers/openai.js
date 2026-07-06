/**
 * Adaptador OpenAI — GPT Image (text-to-image, image-to-image).
 * @see https://developers.openai.com/api/docs/guides/image-generation
 */

import {
  OPENAI_API_BASE,
  openaiHeaders,
  parseOpenAIError,
  fetchAsBlob,
} from '@/src/lib/providers/openaiShared';

const APP_TO_IMAGE_MODEL = {
  'gpt-image-1.5': 'gpt-image-1.5',
  'gpt-image-2': 'gpt-image-2',
  'gpt-image-1.5-edit': 'gpt-image-1.5',
  'gpt-image-2-edit': 'gpt-image-2',
};

const GPT_IMAGE_15_ASPECTS = new Set(['1:1', '2:3', '3:2']);

function resolveImageApiModel(modelId) {
  if (APP_TO_IMAGE_MODEL[modelId]) return APP_TO_IMAGE_MODEL[modelId];
  const id = String(modelId || '').toLowerCase();
  if (id.includes('gpt-image-2')) return 'gpt-image-2';
  if (id.includes('gpt-image')) return 'gpt-image-1.5';
  return null;
}

function normalizeAspect(aspect) {
  const value = String(aspect || '1:1').trim();
  if (value === 'auto') return 'auto';
  return value;
}

function resolveGptImage15Size(aspect) {
  const ratio = normalizeAspect(aspect);
  if (ratio === '2:3' || ratio === '3:4' || ratio === '9:16') return '1024x1536';
  if (ratio === '3:2' || ratio === '4:3' || ratio === '16:9') return '1536x1024';
  return '1024x1024';
}

function resolveGptImage2Size(aspect, resolution) {
  const ratio = normalizeAspect(aspect);
  const res = String(resolution || '2K').trim().toUpperCase();

  const sizeByRes = {
    '1K': {
      '1:1': '1024x1024',
      '2:3': '1024x1536',
      '3:4': '1024x1536',
      '9:16': '1024x1536',
      '3:2': '1536x1024',
      '4:3': '1536x1024',
      '16:9': '1536x1024',
      auto: 'auto',
    },
    '2K': {
      '1:1': '2048x2048',
      '2:3': '2048x3072',
      '3:4': '2048x2732',
      '9:16': '2048x3648',
      '3:2': '3072x2048',
      '4:3': '2732x2048',
      '16:9': '3840x2160',
      auto: 'auto',
    },
    '4K': {
      '1:1': '3840x3840',
      '2:3': '2160x3840',
      '3:4': '2160x2880',
      '9:16': '2160x3840',
      '3:2': '3840x2160',
      '4:3': '3840x2880',
      '16:9': '3840x2160',
      auto: 'auto',
    },
  };

  const table = sizeByRes[res] || sizeByRes['2K'];
  return table[ratio] || table['1:1'];
}

function resolveImageSize(modelId, payload) {
  const apiModel = resolveImageApiModel(modelId);
  const aspect = payload.aspect_ratio;

  if (apiModel === 'gpt-image-2') {
    return resolveGptImage2Size(aspect, payload.resolution);
  }

  const ratio = normalizeAspect(aspect);
  if (ratio === 'auto') return 'auto';
  if (GPT_IMAGE_15_ASPECTS.has(ratio)) return resolveGptImage15Size(ratio);
  return resolveGptImage15Size(ratio);
}

function normalizeQuality(quality) {
  const value = String(quality || '').trim().toLowerCase();
  if (['low', 'medium', 'high', 'auto'].includes(value)) return value;
  return 'auto';
}

function toImageResult(modelId, apiModel, b64, mimeType = 'image/png') {
  return {
    url: `data:${mimeType};base64,${b64}`,
    status: 'completed',
    provider: 'openai',
    model: modelId,
    openai_api_model: apiModel,
  };
}

export function isOpenAIImageModel(modelContext) {
  if (!modelContext) return false;
  if (!['t2i', 'i2i'].includes(modelContext.kind)) return false;
  const id = String(modelContext.id || '').toLowerCase();
  return /gpt-image|dall-e|dalle|openai.*image/.test(id);
}

async function generateWithGenerations(modelId, apiModel, payload, apiKey) {
  const body = {
    model: apiModel,
    prompt: payload.prompt?.trim(),
    size: resolveImageSize(modelId, payload),
    n: 1,
  };

  const quality = normalizeQuality(payload.quality);
  if (quality !== 'auto') body.quality = quality;

  const response = await fetch(`${OPENAI_API_BASE}/images/generations`, {
    method: 'POST',
    headers: openaiHeaders(apiKey),
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw parseOpenAIError(data, response.status, `OpenAI/${apiModel}`);

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error(`OpenAI/${apiModel} respondió sin imagen`);

  return toImageResult(modelId, apiModel, b64);
}

async function generateWithEdits(modelId, apiModel, payload, apiKey) {
  const images = payload.images_list?.length
    ? payload.images_list
    : (payload.image_url ? [payload.image_url] : []);

  if (!images.length) {
    throw new Error('Se requiere al menos una imagen de referencia para la edición');
  }

  const form = new FormData();
  form.append('model', apiModel);
  form.append('prompt', payload.prompt?.trim() || 'Edit this image according to the instructions.');
  form.append('size', resolveImageSize(modelId, payload));

  const quality = normalizeQuality(payload.quality);
  if (quality !== 'auto') form.append('quality', quality);

  for (const imageUrl of images.slice(0, 16)) {
    const blob = await fetchAsBlob(imageUrl);
    if (blob) form.append('image[]', blob, 'reference.png');
  }

  const response = await fetch(`${OPENAI_API_BASE}/images/edits`, {
    method: 'POST',
    headers: openaiHeaders(apiKey, null),
    body: form,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw parseOpenAIError(data, response.status, `OpenAI/${apiModel}/edit`);

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error(`OpenAI/${apiModel} edit respondió sin imagen`);

  return toImageResult(modelId, apiModel, b64);
}

export async function generateOpenAIImage(modelContext, payload, apiKey) {
  const trimmedKey = String(apiKey || '').trim();
  if (!trimmedKey) throw new Error('Clave de OpenAI no configurada');
  if (!payload?.prompt?.trim() && modelContext.kind !== 'i2i') {
    throw new Error('Se requiere un prompt para generar la imagen');
  }

  const modelId = modelContext.id;
  const apiModel = resolveImageApiModel(modelId);
  if (!apiModel) throw new Error(`Modelo OpenAI imagen no soportado: ${modelId}`);

  const isEdit = modelContext.kind === 'i2i' || /edit/.test(modelId);
  if (isEdit) {
    return generateWithEdits(modelId, apiModel, payload, trimmedKey);
  }
  return generateWithGenerations(modelId, apiModel, payload, trimmedKey);
}
