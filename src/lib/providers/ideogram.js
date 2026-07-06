/**
 * Adaptador Ideogram — v3 generate / reframe / character.
 * @see https://developer.ideogram.ai/
 */

import { fetchAsBlob } from '@/src/lib/providers/openaiShared';

const IDEOGRAM_API_BASE = 'https://api.ideogram.ai/v1';

const APP_TO_IDEOGRAM_PATH = {
  'ideogram-v3-t2i': '/ideogram-v3/generate',
  'ideogram-character': '/ideogram-v3/generate',
  'ideogram-v3-reframe': '/ideogram-v3/reframe',
};

const ASPECT_TO_IDEOGRAM = {
  '1:1': '1x1',
  '16:9': '16x9',
  '9:16': '9x16',
  '4:3': '4x3',
  '3:4': '3x4',
  '3:2': '3x2',
  '2:3': '2x3',
  '21:9': '16x9',
  '9:21': '9x16',
  '16:21': '9x16',
};

const RENDER_SPEED_MAP = {
  turbo: 'TURBO',
  balanced: 'DEFAULT',
  quality: 'QUALITY',
  flash: 'FLASH',
  default: 'DEFAULT',
};

const STYLE_MAP = {
  auto: 'AUTO',
  general: 'GENERAL',
  realistic: 'REALISTIC',
  design: 'DESIGN',
  fiction: 'FICTION',
};

export function resolveIdeogramApiKeyFromEnv() {
  const key = process.env.IDEOGRAM_API_KEY || process.env.IDEOGRAM_KEY;
  return key?.trim() || null;
}

function ideogramHeaders(apiKey) {
  return { 'Api-Key': String(apiKey || '').trim() };
}

function parseIdeogramError(data, status) {
  const msg =
    data?.message
    || data?.error
    || data?.detail
    || JSON.stringify(data).slice(0, 400);
  return new Error(`Ideogram (${status}): ${msg}`);
}

function extractIdeogramImageUrl(data) {
  const url = data?.data?.[0]?.url;
  return typeof url === 'string' ? url : null;
}

function resolveIdeogramPath(modelContext) {
  const id = modelContext?.id;
  const endpoint = modelContext?.endpoint;
  if (id && APP_TO_IDEOGRAM_PATH[id]) return APP_TO_IDEOGRAM_PATH[id];
  if (endpoint && APP_TO_IDEOGRAM_PATH[endpoint]) return APP_TO_IDEOGRAM_PATH[endpoint];

  const haystack = `${id} ${endpoint}`.toLowerCase();
  if (haystack.includes('reframe')) return '/ideogram-v3/reframe';
  if (haystack.includes('character')) return '/ideogram-v3/generate';
  if (haystack.includes('ideogram')) return '/ideogram-v3/generate';
  return null;
}

export function isIdeogramModel(modelContext) {
  if (!modelContext) return false;
  if (modelContext.provider === 'ideogram') return Boolean(resolveIdeogramPath(modelContext));
  const id = String(modelContext.id || '').toLowerCase();
  return id.includes('ideogram') && Boolean(resolveIdeogramPath(modelContext));
}

function normalizeAspectRatio(aspect) {
  const value = String(aspect || '1:1').trim();
  return ASPECT_TO_IDEOGRAM[value] || '1x1';
}

function normalizeRenderSpeed(speed) {
  const key = String(speed || 'Balanced').trim().toLowerCase();
  return RENDER_SPEED_MAP[key] || 'DEFAULT';
}

function normalizeStyle(style) {
  const key = String(style || 'Auto').trim().toLowerCase();
  return STYLE_MAP[key] || 'AUTO';
}

async function appendImageField(form, fieldName, imageUrl, fileName = 'image.png') {
  const blob = await fetchAsBlob(imageUrl);
  if (!blob) throw new Error('No se pudo cargar la imagen de entrada');
  form.append(fieldName, blob, fileName);
}

async function buildGenerateForm(modelContext, payload) {
  const form = new FormData();
  const prompt = String(payload.prompt || '').trim();
  if (prompt) form.append('prompt', prompt);

  form.append('aspect_ratio', normalizeAspectRatio(payload.aspect_ratio));
  form.append('rendering_speed', normalizeRenderSpeed(payload.render_speed || payload.rendering_speed));
  form.append('style_type', normalizeStyle(payload.style));

  if (payload.num_images != null) form.append('num_images', String(payload.num_images));
  if (payload.seed != null && payload.seed !== '') form.append('seed', String(payload.seed));
  if (payload.negative_prompt) form.append('negative_prompt', String(payload.negative_prompt));

  const isCharacter = modelContext.id === 'ideogram-character'
    || String(modelContext.endpoint || '').includes('character');

  if (isCharacter && payload.image_url) {
    await appendImageField(form, 'character_reference_images', payload.image_url, 'character.png');
  }

  return form;
}

async function buildReframeForm(payload) {
  const form = new FormData();
  const imageUrl = payload.image_url || payload.images_list?.[0];
  if (!imageUrl) throw new Error('Se requiere una imagen para reframe');

  await appendImageField(form, 'image', imageUrl, 'input.png');
  form.append('rendering_speed', normalizeRenderSpeed(payload.render_speed || payload.rendering_speed));

  const resolution = payload.resolution || payload.target_resolution;
  if (resolution) {
    form.append('resolution', String(resolution));
  } else if (payload.aspect_ratio) {
    form.append('aspect_ratio', normalizeAspectRatio(payload.aspect_ratio));
  }

  return form;
}

export async function generateIdeogramImage(modelContext, payload, apiKey) {
  const trimmedKey = String(apiKey || '').trim();
  if (!trimmedKey) throw new Error('Clave de Ideogram no configurada');

  const path = resolveIdeogramPath(modelContext);
  if (!path) {
    throw new Error(`Modelo Ideogram no soportado: ${modelContext.id}`);
  }

  const form = path.includes('reframe')
    ? await buildReframeForm(payload)
    : await buildGenerateForm(modelContext, payload);

  const response = await fetch(`${IDEOGRAM_API_BASE}${path}`, {
    method: 'POST',
    headers: ideogramHeaders(trimmedKey),
    body: form,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw parseIdeogramError(data, response.status);
  }

  const url = extractIdeogramImageUrl(data);
  if (!url) {
    throw new Error('Ideogram completó sin URL de imagen');
  }

  return {
    url,
    status: 'completed',
    provider: 'ideogram',
    model: modelContext.id,
    ideogram_path: path,
    raw: data,
  };
}
