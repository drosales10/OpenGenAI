/**
 * Adaptador fal.ai — Wan imagen (t2i, i2i, edit).
 */

import { falQueueRun } from '@/src/lib/providers/falShared';

const IMAGE_KINDS = new Set(['t2i', 'i2i']);

const APP_TO_FAL_WAN_IMAGE = {
  'wan2.1-text-to-image': 'fal-ai/wan/v2.1/1.3b/text-to-image',
  'wan2.5-text-to-image': 'fal-ai/wan-25-preview/text-to-image',
  'wan2.6-text-to-image': 'wan/v2.6/text-to-image',
  'wan2.5-image-edit': 'fal-ai/wan-25-preview/image-to-image',
  'wan2.6-image-edit': 'wan/v2.6/image-to-image',
};

function resolveWanImageEndpointHeuristic(modelContext) {
  const id = String(modelContext?.id || modelContext?.endpoint || '').toLowerCase();
  const isEdit = /edit|i2i/.test(id) || modelContext.kind === 'i2i';

  if (/2\.6|v2\.6/.test(id)) {
    return isEdit ? 'wan/v2.6/image-to-image' : 'wan/v2.6/text-to-image';
  }
  if (/2\.5|v2\.5/.test(id)) {
    return isEdit ? 'fal-ai/wan-25-preview/image-to-image' : 'fal-ai/wan-25-preview/text-to-image';
  }
  if (/2\.1|v2\.1/.test(id)) {
    return 'fal-ai/wan/v2.1/1.3b/text-to-image';
  }
  if (/^wan|wan2/.test(id)) {
    return isEdit ? 'wan/v2.6/image-to-image' : 'wan/v2.6/text-to-image';
  }
  return null;
}

export function resolveFalWanImageEndpoint(modelContext) {
  const id = modelContext?.id;
  const endpoint = modelContext?.endpoint;
  if (id && APP_TO_FAL_WAN_IMAGE[id]) return APP_TO_FAL_WAN_IMAGE[id];
  if (endpoint && APP_TO_FAL_WAN_IMAGE[endpoint]) return APP_TO_FAL_WAN_IMAGE[endpoint];
  return resolveWanImageEndpointHeuristic(modelContext);
}

export function isFalWanImageModel(modelContext) {
  if (!modelContext) return false;
  if (modelContext.provider !== 'wan') return false;
  if (!IMAGE_KINDS.has(modelContext.kind)) return false;
  return Boolean(resolveFalWanImageEndpoint(modelContext));
}

function buildWanImageInput(modelContext, payload) {
  const input = {};
  const prompt = String(payload.prompt || '').trim();
  if (prompt) input.prompt = prompt;

  if (payload.width != null && payload.height != null) {
    input.image_size = {
      width: Number(payload.width),
      height: Number(payload.height),
    };
  }

  if (payload.negative_prompt) input.negative_prompt = String(payload.negative_prompt);
  if (payload.seed != null && payload.seed !== '') input.seed = Number(payload.seed);

  const imageUrl = payload.image_url || payload.images_list?.[0];
  if (imageUrl) input.image_url = imageUrl;

  const refs = payload.images_list?.length ? payload.images_list : null;
  if (refs?.length && modelContext.kind === 'i2i') {
    input.image_urls = refs;
  }

  return input;
}

export async function generateFalWanImage(modelContext, payload, apiKey) {
  const falEndpoint = resolveFalWanImageEndpoint(modelContext);
  if (!falEndpoint) {
    throw new Error(`Modelo Wan imagen no mapeado a fal.ai: ${modelContext.id}`);
  }

  const input = buildWanImageInput(modelContext, payload);
  if (!input.prompt && !input.image_url && !input.image_urls?.length) {
    throw new Error('Se requiere un prompt o imagen para generar');
  }

  const result = await falQueueRun(falEndpoint, input, apiKey);
  return {
    ...result,
    provider: 'wan',
    model: modelContext.id,
    fal_endpoint: falEndpoint,
    fal_routing: true,
  };
}
