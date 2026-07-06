/**
 * Adaptador fal.ai — modelos Flux / Kontext.
 * @see https://fal.ai/models
 */

import { falQueueRun } from '@/src/lib/providers/falShared';

const APP_TO_FAL_ENDPOINT = {
  'flux-dev': 'fal-ai/flux/dev',
  'flux-dev-image': 'fal-ai/flux/dev',
  'flux-schnell': 'fal-ai/flux/schnell',
  'flux-dev-lora': 'fal-ai/flux-lora',
  'flux-kontext-dev-t2i': 'fal-ai/flux-kontext-lora/text-to-image',
  'flux-kontext-pro-t2i': 'fal-ai/flux-pro/kontext/text-to-image',
  'flux-kontext-max-t2i': 'fal-ai/flux-pro/kontext/max/text-to-image',
  'flux-kontext-dev-i2i': 'fal-ai/flux-kontext/dev',
  'flux-kontext-pro-i2i': 'fal-ai/flux-pro/kontext',
  'flux-kontext-max-i2i': 'fal-ai/flux-pro/kontext/max',
  'flux-2-dev': 'fal-ai/flux-2',
  'flux-2-flex': 'fal-ai/flux-2-flex',
  'flux-2-pro': 'fal-ai/flux-2-pro',
  'flux-2-dev-edit': 'fal-ai/flux-2/edit',
  'flux-2-flex-edit': 'fal-ai/flux-2-flex/edit',
  'flux-2-pro-edit': 'fal-ai/flux-2-pro/edit',
  'flux-2-klein-4b': 'fal-ai/flux-2/klein/4b',
  'flux-2-klein-9b': 'fal-ai/flux-2/klein/9b',
  'flux-2-klein-4b-edit': 'fal-ai/flux-2/klein/4b/edit',
  'flux-2-klein-9b-edit': 'fal-ai/flux-2/klein/9b/edit',
  'flux-pulid': 'fal-ai/flux-pulid',
  'flux-redux': 'fal-ai/flux/dev/redux',
  'flux-krea-dev': 'fal-ai/flux/krea',
  'flux-kontext-effects': 'fal-ai/flux-kontext/dev',
};

const ASPECT_TO_FAL_IMAGE_SIZE = {
  '1:1': 'square_hd',
  '16:9': 'landscape_16_9',
  '9:16': 'portrait_16_9',
  '4:3': 'landscape_4_3',
  '3:4': 'portrait_4_3',
  '3:2': 'landscape_4_3',
  '2:3': 'portrait_4_3',
  '21:9': 'landscape_16_9',
  '9:21': 'portrait_16_9',
  '16:21': 'portrait_16_9',
};

function resolveFalEndpointHeuristic(modelId) {
  const id = String(modelId || '').toLowerCase();

  if (id.includes('kontext') && id.includes('max') && id.includes('t2i')) {
    return 'fal-ai/flux-pro/kontext/max/text-to-image';
  }
  if (id.includes('kontext') && id.includes('pro') && id.includes('t2i')) {
    return 'fal-ai/flux-pro/kontext/text-to-image';
  }
  if (id.includes('kontext') && id.includes('dev') && id.includes('t2i')) {
    return 'fal-ai/flux-kontext-lora/text-to-image';
  }
  if (id.includes('kontext') && id.includes('max')) return 'fal-ai/flux-pro/kontext/max';
  if (id.includes('kontext') && id.includes('pro')) return 'fal-ai/flux-pro/kontext';
  if (id.includes('kontext') && id.includes('dev')) return 'fal-ai/flux-kontext/dev';

  if (id.includes('flux-2') && id.includes('klein') && id.includes('9b') && id.includes('edit')) {
    return 'fal-ai/flux-2/klein/9b/edit';
  }
  if (id.includes('flux-2') && id.includes('klein') && id.includes('4b') && id.includes('edit')) {
    return 'fal-ai/flux-2/klein/4b/edit';
  }
  if (id.includes('flux-2') && id.includes('klein') && id.includes('9b')) {
    return 'fal-ai/flux-2/klein/9b';
  }
  if (id.includes('flux-2') && id.includes('klein') && id.includes('4b')) {
    return 'fal-ai/flux-2/klein/4b';
  }
  if (id.includes('flux-2') && id.includes('pro') && id.includes('edit')) return 'fal-ai/flux-2-pro/edit';
  if (id.includes('flux-2') && id.includes('flex') && id.includes('edit')) return 'fal-ai/flux-2-flex/edit';
  if (id.includes('flux-2') && id.includes('dev') && id.includes('edit')) return 'fal-ai/flux-2/edit';
  if (id.includes('flux-2') && id.includes('pro')) return 'fal-ai/flux-2-pro';
  if (id.includes('flux-2') && id.includes('flex')) return 'fal-ai/flux-2-flex';
  if (id.includes('flux-2') && id.includes('dev')) return 'fal-ai/flux-2';

  if (id.includes('schnell')) return 'fal-ai/flux/schnell';
  if (id.includes('pulid')) return 'fal-ai/flux-pulid';
  if (id.includes('redux')) return 'fal-ai/flux/dev/redux';
  if (id.includes('krea')) return 'fal-ai/flux/krea';
  if (id.includes('lora')) return 'fal-ai/flux-lora';
  if (id.startsWith('flux')) return 'fal-ai/flux/dev';

  return null;
}

export function resolveFalEndpoint(modelContext) {
  const id = modelContext?.id;
  const endpoint = modelContext?.endpoint;

  if (id && APP_TO_FAL_ENDPOINT[id]) return APP_TO_FAL_ENDPOINT[id];
  if (endpoint && APP_TO_FAL_ENDPOINT[endpoint]) return APP_TO_FAL_ENDPOINT[endpoint];

  return resolveFalEndpointHeuristic(id || endpoint);
}

export function isFalModel(modelContext) {
  if (!modelContext) return false;
  if (modelContext.provider === 'fal') return Boolean(resolveFalEndpoint(modelContext));

  const family = String(modelContext.family || '').toLowerCase();
  const id = String(modelContext.id || '').toLowerCase();
  if (family === 'flux' || family === 'kontext') return Boolean(resolveFalEndpoint(modelContext));
  if (/^flux|kontext/.test(id)) return Boolean(resolveFalEndpoint(modelContext));

  return false;
}

function usesMultiImageUrls(falEndpoint) {
  return /\/edit|flux-2|klein/.test(falEndpoint);
}

function buildFalInput(modelContext, payload, falEndpoint) {
  const input = {};
  const prompt = String(payload.prompt || '').trim();
  if (prompt) input.prompt = prompt;

  if (payload.width != null) input.width = Number(payload.width);
  if (payload.height != null) input.height = Number(payload.height);
  if (payload.num_images != null) input.num_images = Number(payload.num_images);
  if (payload.seed != null && payload.seed !== '') input.seed = Number(payload.seed);
  if (payload.guidance_scale != null) input.guidance_scale = Number(payload.guidance_scale);
  if (payload.num_inference_steps != null) {
    input.num_inference_steps = Number(payload.num_inference_steps);
  }

  const images = payload.images_list?.length
    ? payload.images_list
    : (payload.image_url ? [payload.image_url] : null);

  if (images?.length) {
    if (usesMultiImageUrls(falEndpoint)) {
      input.image_urls = images;
    } else {
      input.image_url = images[0];
    }
  }

  if (payload.aspect_ratio && input.width == null) {
    const size = ASPECT_TO_FAL_IMAGE_SIZE[String(payload.aspect_ratio).trim()];
    if (size) input.image_size = size;
  }

  if (payload.lora_url) {
    input.loras = [{ path: payload.lora_url, scale: Number(payload.lora_scale ?? 1) }];
  } else if (payload.loras) {
    input.loras = payload.loras;
  }

  return input;
}

export async function generateFalImage(modelContext, payload, apiKey) {
  const falEndpoint = resolveFalEndpoint(modelContext);
  if (!falEndpoint) {
    throw new Error(`Modelo Flux no mapeado a fal.ai: ${modelContext.id}`);
  }

  const input = buildFalInput(modelContext, payload, falEndpoint);
  if (!input.prompt && !input.image_url && !input.image_urls?.length) {
    throw new Error('Se requiere un prompt o imagen para generar');
  }

  const result = await falQueueRun(falEndpoint, input, apiKey);
  return {
    ...result,
    provider: 'fal',
    model: modelContext.id,
    fal_endpoint: falEndpoint,
  };
}
