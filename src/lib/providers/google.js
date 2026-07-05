/**
 * Adaptador Google AI Studio — Gemini 3.x Image (Nano Banana 2 / Pro).
 * Nota: gemini-3.5-flash es solo texto; imagen usa gemini-3.1-flash-image y gemini-3-pro-image.
 */

const GOOGLE_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const GEMINI_NATIVE_MODELS = new Set([
  'nano-banana',
  'nano-banana-2',
  'nano-banana-pro',
  'nano-banana-pro-edit',
]);

const GOOGLE_IMAGEN_APP_MODELS = new Set([
  'google-imagen4',
  'google-imagen4-fast',
  'google-imagen4-ultra',
]);

/**
 * Mapeo app → API Google (generación de imagen, familia 3.x).
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */
const APP_TO_GEMINI_IMAGE_API = {
  'nano-banana': ['gemini-3.1-flash-image', 'gemini-3.1-flash-image-preview'],
  'nano-banana-2': ['gemini-3.1-flash-image', 'gemini-3.1-flash-image-preview'],
  'nano-banana-pro': ['gemini-3-pro-image', 'gemini-3-pro-image-preview'],
  'nano-banana-pro-edit': ['gemini-3-pro-image', 'gemini-3-pro-image-preview'],
  'google-imagen4': ['gemini-3.1-flash-image'],
  'google-imagen4-fast': ['gemini-3.1-flash-lite-image', 'gemini-3.1-flash-image'],
  'google-imagen4-ultra': ['gemini-3-pro-image', 'gemini-3-pro-image-preview'],
};

const DEFAULT_GEMINI_IMAGE_API = [
  'gemini-3.1-flash-image',
  'gemini-3.1-flash-image-preview',
  'gemini-3.1-flash-lite-image',
];

const GEMINI_ASPECT = new Set([
  '1:1', '1:4', '1:8', '2:3', '3:2', '3:4', '4:1', '4:3', '4:5',
  '5:4', '8:1', '9:16', '16:9', '21:9',
]);

const RESOLUTION_TO_IMAGE_SIZE = {
  '512': '512px',
  '512px': '512px',
  '0.5k': '512px',
  '1k': '1K',
  '2k': '2K',
  '4k': '4K',
};

function resolveGeminiApiModels(modelId) {
  const mapped = APP_TO_GEMINI_IMAGE_API[modelId];
  if (!mapped) return DEFAULT_GEMINI_IMAGE_API;
  return [...new Set([...mapped, ...DEFAULT_GEMINI_IMAGE_API])];
}

function resolveInteractionsApiModel(modelId) {
  if (modelId.includes('pro')) return 'gemini-3-pro-image';
  if (modelId.includes('fast') || modelId.includes('lite')) return 'gemini-3.1-flash-lite-image';
  return 'gemini-3.1-flash-image';
}

function normalizeAspect(ratio) {
  const value = String(ratio || '1:1').trim();
  if (value === 'auto') return '1:1';
  return GEMINI_ASPECT.has(value) ? value : '1:1';
}

function normalizeImageSize(resolution) {
  if (!resolution) return null;
  const key = String(resolution).trim().toLowerCase();
  return RESOLUTION_TO_IMAGE_SIZE[key] || null;
}

function googleHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey,
  };
}

function parseGoogleError(data, status, label = 'Google AI') {
  const msg =
    data?.error?.message
    || data?.error?.details?.[0]?.message
    || (typeof data?.error === 'string' ? data.error : null)
    || JSON.stringify(data).slice(0, 400);
  return new Error(`${label} (${status}): ${msg}`);
}

function walkForImage(node, found = []) {
  if (!node || typeof node !== 'object') return found;

  if (node.inlineData?.data) {
    found.push({ mime: node.inlineData.mimeType || 'image/png', b64: node.inlineData.data });
  }
  if (node.inline_data?.data) {
    found.push({ mime: node.inline_data.mime_type || 'image/png', b64: node.inline_data.data });
  }
  if (node.type === 'image' && node.data) {
    found.push({ mime: node.mime_type || node.mimeType || 'image/png', b64: node.data });
  }
  if (node.output_image?.data) {
    found.push({
      mime: node.output_image.mime_type || node.output_image.mimeType || 'image/png',
      b64: node.output_image.data,
    });
  }

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach((item) => walkForImage(item, found));
    else if (value && typeof value === 'object') walkForImage(value, found);
  }

  return found;
}

function extractGenerateContentImage(data) {
  const images = walkForImage(data);
  if (images.length) return images[0];

  const blockReason = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason;
  if (blockReason && blockReason !== 'STOP') {
    throw new Error(`Google AI bloqueó la generación: ${blockReason}`);
  }

  return null;
}

function toImageResult(modelId, image, apiModel) {
  return {
    url: `data:${image.mime};base64,${image.b64}`,
    provider: 'google',
    model: modelId,
    google_api_model: apiModel,
    status: 'completed',
  };
}

async function callGenerateContent(apiModel, modelId, payload, apiKey, withImageConfig) {
  const aspect = normalizeAspect(payload.aspect_ratio);
  const imageSize = normalizeImageSize(payload.resolution);

  const generationConfig = {
    responseModalities: ['TEXT', 'IMAGE'],
  };

  if (withImageConfig) {
    generationConfig.imageConfig = { aspectRatio: aspect };
    if (imageSize) generationConfig.imageConfig.imageSize = imageSize;
  }

  const url = `${GOOGLE_API_BASE}/models/${apiModel}:generateContent`;
  const response = await fetch(url, {
    method: 'POST',
    headers: googleHeaders(apiKey),
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: payload.prompt }] }],
      generationConfig,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw parseGoogleError(data, response.status, `Gemini/${apiModel}`);

  const image = extractGenerateContentImage(data);
  if (!image) throw new Error(`Gemini/${apiModel} respondió sin imagen`);

  return toImageResult(modelId, image, apiModel);
}

async function generateWithGeminiContent(modelId, payload, apiKey) {
  const apiModels = resolveGeminiApiModels(modelId);
  const errors = [];

  for (const apiModel of apiModels) {
    for (const withImageConfig of [true, false]) {
      try {
        return await callGenerateContent(apiModel, modelId, payload, apiKey, withImageConfig);
      } catch (error) {
        errors.push(error.message);
        if (String(error.message).includes('(404)')) break;
      }
    }
  }

  throw new Error(errors[0] || 'Gemini 3.x generateContent falló');
}

async function generateWithInteractions(modelId, payload, apiKey) {
  const apiModel = resolveInteractionsApiModel(modelId);
  const aspect = normalizeAspect(payload.aspect_ratio);
  const imageSize = normalizeImageSize(payload.resolution);

  const buildBody = (withFormat) => {
    const body = {
      model: apiModel,
      input: [{ type: 'text', text: payload.prompt }],
    };
    if (withFormat) {
      body.response_format = { type: 'image', aspect_ratio: aspect };
      if (imageSize) body.response_format.image_size = imageSize;
    }
    return body;
  };

  const errors = [];
  for (const withFormat of [true, false]) {
    const response = await fetch(`${GOOGLE_API_BASE}/interactions`, {
      method: 'POST',
      headers: googleHeaders(apiKey),
      body: JSON.stringify(buildBody(withFormat)),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      errors.push(parseGoogleError(data, response.status, 'Interactions').message);
      continue;
    }

    const images = walkForImage(data);
    if (images.length) return toImageResult(modelId, images[0], apiModel);
    errors.push(`Interactions/${apiModel} respondió sin imagen`);
  }

  throw new Error(errors[0] || 'Interactions falló');
}

export async function generateGoogleImage(modelContext, payload, apiKey) {
  if (!payload?.prompt?.trim()) {
    throw new Error('Se requiere un prompt para generar la imagen');
  }

  const trimmedKey = String(apiKey || '').trim();
  if (!trimmedKey) {
    throw new Error('Clave de Google AI no configurada');
  }

  const modelId = modelContext.id;
  const attempts = [
    () => generateWithGeminiContent(modelId, payload, trimmedKey),
    () => generateWithInteractions(modelId, payload, trimmedKey),
  ];

  const errors = [];
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      errors.push(error.message);
    }
  }

  throw new Error(errors.filter(Boolean).join(' | ') || 'Google AI 3.x: generación fallida');
}

export function isGoogleImageModel(modelId) {
  return (
    GEMINI_NATIVE_MODELS.has(modelId)
    || GOOGLE_IMAGEN_APP_MODELS.has(modelId)
    || String(modelId).includes('google')
    || String(modelId).includes('nano-banana')
    || String(modelId).includes('imagen')
  );
}

export function getGeminiImageApiModelsForAppModel(modelId) {
  return resolveGeminiApiModels(modelId);
}
