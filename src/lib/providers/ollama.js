/**
 * Adaptador Ollama — generación de imagen local (experimental).
 * POST /api/generate con model, prompt, width, height → imagen base64.
 */

import { resolveOllamaTagForAppModel } from '@/src/lib/ollamaSubstitutes';
import { ollamaFetch, normalizeOllamaHost } from '@/src/lib/providers/ollamaShared';

const ASPECT_TO_SIZE = {
  '1:1': { width: 1024, height: 1024 },
  '16:9': { width: 1344, height: 768 },
  '9:16': { width: 768, height: 1344 },
  '4:3': { width: 1152, height: 896 },
  '3:4': { width: 896, height: 1152 },
  '3:2': { width: 1216, height: 832 },
  '2:3': { width: 832, height: 1216 },
  '21:9': { width: 1536, height: 640 },
};

function snap64(n, min = 512, max = 1536) {
  const v = Math.max(min, Math.min(max, Number(n) || 1024));
  return Math.round(v / 64) * 64;
}

function resolveDimensions(payload = {}) {
  if (payload.width && payload.height) {
    return { width: snap64(payload.width), height: snap64(payload.height) };
  }
  const ar = payload.aspect_ratio || '1:1';
  const preset = ASPECT_TO_SIZE[ar] || ASPECT_TO_SIZE['1:1'];
  return { width: preset.width, height: preset.height };
}

export function isOllamaModel(modelContext = {}) {
  const id = String(modelContext.id || modelContext.endpoint || '').toLowerCase();
  return id.startsWith('ollama-') || modelContext.provider === 'ollama';
}

export function resolveOllamaModelTag(modelContext = {}) {
  if (modelContext.ollamaModel) return modelContext.ollamaModel;
  return resolveOllamaTagForAppModel(modelContext.id || modelContext.endpoint);
}

export async function generateOllamaImage(modelContext, payload, host) {
  const baseHost = normalizeOllamaHost(host);
  const ollamaModel = resolveOllamaModelTag(modelContext);

  if (!ollamaModel) {
    throw new Error(`No hay modelo Ollama mapeado para "${modelContext.id}".`);
  }

  const prompt = String(payload.prompt || '').trim();
  if (!prompt) throw new Error('El prompt es obligatorio.');

  const { width, height } = resolveDimensions(payload);

  const response = await ollamaFetch('/api/generate', {
    host: baseHost,
    method: 'POST',
    body: {
      model: ollamaModel,
      prompt,
      stream: false,
      width,
      height,
    },
    timeoutMs: 600000,
  });

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 404 || /not found|pull/i.test(errText)) {
      throw new Error(
        `Modelo "${ollamaModel}" no está instalado. Ejecuta: ollama pull ${ollamaModel}`
      );
    }
    throw new Error(`Ollama error (${response.status}): ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const b64 = data.image || data.images?.[0];
  if (!b64) {
    throw new Error(
      'Ollama no devolvió imagen. ¿Tienes una versión con soporte de imagen? (macOS, Ollama ≥ ene 2026)'
    );
  }

  const raw = String(b64).replace(/^data:image\/\w+;base64,/, '');
  const dataUrl = `data:image/png;base64,${raw}`;

  return {
    status: 'completed',
    url: dataUrl,
    outputs: [dataUrl],
    ollama_model: ollamaModel,
    width,
    height,
  };
}
