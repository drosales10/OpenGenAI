/**
 * Adaptador Replicate — SDXL y modelos Stable Diffusion.
 * Fallback fal: fal-ai/fast-sdxl cuando solo hay FAL_KEY.
 * @see https://replicate.com/stability-ai/sdxl
 */

import { falQueueRun } from '@/src/lib/providers/falShared';

const REPLICATE_API = 'https://api.replicate.com/v1';
const SDXL_MODEL = 'stability-ai/sdxl';

export function resolveReplicateApiKeyFromEnv() {
  const key = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_KEY;
  return key?.trim() || null;
}

export function isReplicateModel(modelContext) {
  if (!modelContext) return false;
  if (modelContext.provider !== 'replicate') return false;
  const id = String(modelContext.id || '').toLowerCase();
  return /sdxl|stable-diffusion|stability/.test(id);
}

function parseReplicateError(data, status) {
  const msg = data?.detail || data?.error || JSON.stringify(data).slice(0, 400);
  return new Error(`Replicate (${status}): ${msg}`);
}

function extractReplicateOutputUrl(output) {
  if (!output) return null;
  if (typeof output === 'string') return output;
  if (Array.isArray(output) && output.length) {
    return typeof output[0] === 'string' ? output[0] : output[0]?.url;
  }
  if (output.url) return output.url;
  return null;
}

async function pollReplicatePrediction(getUrl, apiKey, maxAttempts = 180, interval = 2000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, interval));
    const response = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status >= 500) continue;
      throw parseReplicateError(data, response.status);
    }

    if (data.status === 'succeeded') {
      const url = extractReplicateOutputUrl(data.output);
      if (!url) throw new Error('Replicate completó sin URL de imagen');
      return { ...data, url, status: 'completed' };
    }
    if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(data.error || 'Generación fallida en Replicate');
    }
  }
  throw new Error('Replicate: tiempo de espera agotado');
}

async function generateViaReplicateApi(modelContext, payload, apiKey) {
  const input = {
    prompt: String(payload.prompt || '').trim(),
  };
  if (payload.negative_prompt) input.negative_prompt = String(payload.negative_prompt);
  if (payload.width != null) input.width = Number(payload.width);
  if (payload.height != null) input.height = Number(payload.height);
  if (payload.seed != null && payload.seed !== '') input.seed = Number(payload.seed);
  if (payload.num_outputs != null) input.num_outputs = Number(payload.num_outputs);

  if (!input.prompt) throw new Error('Se requiere un prompt para generar la imagen');

  const response = await fetch(`${REPLICATE_API}/models/${SDXL_MODEL}/predictions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw parseReplicateError(data, response.status);

  const directUrl = extractReplicateOutputUrl(data.output);
  if (data.status === 'succeeded' && directUrl) {
    return { ...data, url: directUrl, status: 'completed' };
  }

  const getUrl = data.urls?.get;
  if (!getUrl) throw new Error('Replicate: respuesta sin URL de polling');

  const completed = await pollReplicatePrediction(getUrl, apiKey);
  return {
    ...completed,
    provider: 'replicate',
    model: modelContext.id,
    replicate_id: data.id,
  };
}

async function generateViaFalFastSdxl(modelContext, payload, apiKey) {
  const input = {
    prompt: String(payload.prompt || '').trim(),
  };
  if (payload.negative_prompt) input.negative_prompt = String(payload.negative_prompt);
  if (payload.width != null) input.image_size = { width: Number(payload.width), height: Number(payload.height || payload.width) };
  if (payload.seed != null && payload.seed !== '') input.seed = Number(payload.seed);

  if (!input.prompt) throw new Error('Se requiere un prompt para generar la imagen');

  const result = await falQueueRun('fal-ai/fast-sdxl', input, apiKey);
  return {
    ...result,
    provider: 'replicate',
    model: modelContext.id,
    fal_endpoint: 'fal-ai/fast-sdxl',
    fal_routing: true,
  };
}

export async function generateReplicateImage(modelContext, payload, apiKey, { useFalFallback = false } = {}) {
  if (useFalFallback) {
    return generateViaFalFastSdxl(modelContext, payload, apiKey);
  }
  return generateViaReplicateApi(modelContext, payload, apiKey);
}
