import { fetchMediaBytes } from '@/src/lib/server/resolveMediaInput';

const GOOGLE_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Modelos Veo en Gemini API (generativelanguage.googleapis.com).
 * Solo IDs *-preview* soportan predictLongRunning en v1beta.
 * Imágenes: formato Vertex { bytesBase64Encoded, mimeType }, NO inlineData.
 * @see https://ai.google.dev/gemini-api/docs/video
 */
const APP_TO_VEO_API = {
  'veo3-text-to-video': ['veo-3.1-generate-preview'],
  'veo3-fast-text-to-video': ['veo-3.1-fast-generate-preview'],
  'veo3-image-to-video': ['veo-3.1-generate-preview'],
  'veo3-fast-image-to-video': ['veo-3.1-fast-generate-preview', 'veo-3.1-generate-preview'],
  'veo3.1-text-to-video': ['veo-3.1-generate-preview'],
  'veo3.1-fast-text-to-video': ['veo-3.1-fast-generate-preview'],
  'veo3.1-lite-text-to-video': ['veo-3.1-lite-generate-preview'],
  'veo3.1-image-to-video': ['veo-3.1-generate-preview'],
  'veo3.1-fast-image-to-video': ['veo-3.1-fast-generate-preview', 'veo-3.1-generate-preview'],
  'veo3.1-lite-image-to-video': ['veo-3.1-lite-generate-preview'],
  'veo3.1-reference-to-video': ['veo-3.1-generate-preview'],
};

function uniqueList(items) {
  return [...new Set(items.filter(Boolean))];
}

function resolveVeoApiModelCandidates(modelId) {
  const mapped = APP_TO_VEO_API[modelId];
  if (mapped?.length) return uniqueList(mapped);

  const id = String(modelId || '').toLowerCase();
  if (id.includes('lite')) return uniqueList(['veo-3.1-lite-generate-preview']);
  if (id.includes('fast') && id.includes('3.1')) {
    return uniqueList(['veo-3.1-fast-generate-preview']);
  }
  if (id.includes('fast')) {
    return uniqueList(['veo-3.1-fast-generate-preview']);
  }
  if (id.includes('3.1')) return uniqueList(['veo-3.1-generate-preview']);
  if (id.includes('veo')) return uniqueList(['veo-3.1-generate-preview']);
  return [];
}

function resolveVeoApiModel(modelId) {
  return resolveVeoApiModelCandidates(modelId)[0] || null;
}

function isRetryableVeoError(message) {
  return (
    /\((400|404|403)\)/.test(message)
    || /invalid|value|duration|resolution|not found|does not exist|unsupported|models\/veo|inlineData|referenceImages/i.test(message)
  );
}

const VIDEO_KINDS = new Set(['t2v', 'i2v', 'v2v']);

function googleHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey,
  };
}

function parseGoogleError(data, status, label = 'Veo') {
  const msg =
    data?.error?.message
    || data?.error?.details?.[0]?.message
    || (typeof data?.error === 'string' ? data.error : null)
    || JSON.stringify(data).slice(0, 400);
  return new Error(`${label} (${status}): ${msg}`);
}

export function isGoogleVideoModel(modelContext) {
  if (!modelContext) return false;
  const id = String(modelContext.id || modelContext.endpoint || '').toLowerCase();
  if (/veo/.test(id)) return true;
  const kind = modelContext.kind;
  if (!VIDEO_KINDS.has(kind)) return false;
  return /veo/.test(id);
}

async function urlToVeoImage(imageUrl) {
  if (!imageUrl) return null;
  const media = await fetchMediaBytes(imageUrl);
  if (!media) return null;
  return {
    mimeType: media.mimeType || 'image/jpeg',
    bytesBase64Encoded: media.buffer.toString('base64'),
  };
}

function normalizeAspectRatio(ratio) {
  const value = String(ratio || '16:9').trim();
  if (value === '9:16') return '9:16';
  return '16:9';
}

function normalizeResolution(value) {
  if (!value) return null;
  const resolution = String(value).trim().toLowerCase();
  if (resolution === '4k') return '4k';
  if (resolution === '1080p') return '1080p';
  if (resolution === '720p') return '720p';
  return null;
}

function normalizeDurationSeconds(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return null;
  if ([4, 5, 6, 8].includes(parsed)) return parsed;
  return null;
}

function resolveDurationSeconds(payload, resolution, modelContext) {
  const hasReference = /reference/.test(modelContext?.id || '');
  const hasInterpolation = Boolean(payload.last_image);
  let duration = normalizeDurationSeconds(payload.duration);

  if (resolution === '1080p' || resolution === '4k' || hasReference || hasInterpolation) {
    return 8;
  }

  return duration;
}

function buildVeoParameterAttempts(payload, modelContext) {
  const aspectRatio = normalizeAspectRatio(payload.aspect_ratio);
  const resolution = normalizeResolution(payload.resolution);
  const duration = resolveDurationSeconds(payload, resolution, modelContext);
  const attempts = [];

  if (resolution === '1080p' || resolution === '4k') {
    // Ejemplo oficial 4k/1080p: solo resolution (8s implícitos).
    attempts.push({ aspectRatio, resolution });
    attempts.push({ aspectRatio, resolution, durationSeconds: 8 });
    attempts.push({ aspectRatio, resolution, durationSeconds: '8' });
  } else if (resolution === '720p') {
    if (duration) {
      attempts.push({ aspectRatio, resolution, durationSeconds: duration });
      attempts.push({ aspectRatio, resolution, durationSeconds: String(duration) });
    }
    attempts.push({ aspectRatio, resolution });
  } else if (duration) {
    attempts.push({ aspectRatio, durationSeconds: duration });
    attempts.push({ aspectRatio, durationSeconds: String(duration) });
  }

  attempts.push({ aspectRatio });

  const seen = new Set();
  return attempts.filter((parameters) => {
    const key = JSON.stringify(parameters);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function buildVeoInstance(modelContext, payload) {
  const instance = {};
  const prompt = payload.prompt?.trim();
  if (prompt) instance.prompt = prompt;

  const isReference = /reference/.test(modelContext.id || '');
  const imagesList = Array.isArray(payload.images_list) ? payload.images_list : [];

  if (isReference && imagesList.length > 0) {
    instance.referenceImages = [];
    for (const img of imagesList.slice(0, 3)) {
      const image = await urlToVeoImage(img);
      if (image) {
        instance.referenceImages.push({ image, referenceType: 'asset' });
      }
    }
  } else {
    const imageUrl = payload.image_url || imagesList[0];
    if (imageUrl) {
      instance.image = await urlToVeoImage(imageUrl);
    }
    if (payload.last_image) {
      instance.lastFrame = await urlToVeoImage(payload.last_image);
    }
  }

  return instance;
}

function extractVideoUri(completedOperation) {
  return (
    completedOperation?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
    || completedOperation?.response?.generatedVideos?.[0]?.video?.uri
    || completedOperation?.response?.generated_videos?.[0]?.video?.uri
  );
}

async function pollVeoOperation(operationName, apiKey, maxAttempts = 40) {
  const pollUrl = `${GOOGLE_API_BASE}/${operationName}`;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, 10000));
    const response = await fetch(pollUrl, { headers: googleHeaders(apiKey) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw parseGoogleError(data, response.status, 'Veo poll');
    }
    if (data.done) {
      if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
      }
      return data;
    }
  }

  throw new Error('Veo: tiempo de espera agotado (la generación puede tardar hasta 6 minutos)');
}

export function buildGoogleVideoProxyUrl(videoUri, endpoint) {
  const params = new URLSearchParams({ uri: videoUri, endpoint });
  return `/api/generate/media?${params.toString()}`;
}

async function startVeoGeneration(apiModel, instance, parameters, apiKey) {
  const body = { instances: [instance], parameters };
  const startUrl = `${GOOGLE_API_BASE}/models/${apiModel}:predictLongRunning`;
  const startResponse = await fetch(startUrl, {
    method: 'POST',
    headers: googleHeaders(apiKey),
    body: JSON.stringify(body),
  });

  const startData = await startResponse.json().catch(() => ({}));
  if (!startResponse.ok) {
    throw parseGoogleError(startData, startResponse.status, `Veo/${apiModel}`);
  }

  const operationName = startData.name;
  if (!operationName) {
    throw new Error(`Veo/${apiModel} no devolvió operación de generación`);
  }

  return operationName;
}

export async function generateGoogleVideo(modelContext, payload, apiKey) {
  const trimmedKey = String(apiKey || '').trim();
  if (!trimmedKey) {
    throw new Error('Clave de Google AI no configurada');
  }

  const modelId = modelContext.id;
  const apiModels = resolveVeoApiModelCandidates(modelId);
  if (!apiModels.length) {
    throw new Error(`Modelo Veo no soportado: ${modelId}`);
  }

  const instance = await buildVeoInstance(modelContext, payload);
  if (!instance.prompt && !instance.image?.bytesBase64Encoded && !instance.referenceImages?.length) {
    throw new Error('Se requiere un prompt o imagen para generar el video');
  }

  const parameterAttempts = buildVeoParameterAttempts(payload, modelContext);
  const errors = [];
  let operationName = null;
  let usedParameters = null;
  let usedApiModel = null;

  outer:
  for (const apiModel of apiModels) {
    for (const parameters of parameterAttempts) {
      try {
        operationName = await startVeoGeneration(apiModel, instance, parameters, trimmedKey);
        usedParameters = parameters;
        usedApiModel = apiModel;
        break outer;
      } catch (error) {
        errors.push(error.message);
        if (!isRetryableVeoError(error.message)) throw error;
      }
    }
  }

  if (!operationName) {
    throw new Error(errors.join(' | ') || `Veo: no se pudo iniciar la generación para ${modelId}`);
  }

  const completed = await pollVeoOperation(operationName, trimmedKey);
  const videoUri = extractVideoUri(completed);
  if (!videoUri) {
    throw new Error(`Veo/${usedApiModel} completó sin URL de video`);
  }

  const endpoint = modelContext.endpoint || modelId;
  return {
    url: buildGoogleVideoProxyUrl(videoUri, endpoint),
    status: 'completed',
    provider: 'google',
    model: modelId,
    google_api_model: usedApiModel,
    google_video_uri: videoUri,
    veo_parameters: usedParameters,
  };
}
