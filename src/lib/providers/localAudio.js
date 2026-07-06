/**
 * Adaptador audio local — MusicGen / ACE-Step vía servidor HTTP.
 * Contrato: POST /v1/audio/generate → { audio_base64, mime_type? }
 */

import { getLocalAudioModelById } from '@/src/lib/localAudioModels.js';
import { isLocalTtsModel } from '@/src/lib/providers/xtts';
import { localAudioFetch, normalizeLocalAudioHost } from '@/src/lib/providers/localAudioShared';

export function isLocalAudioModel(modelContext = {}) {
  const id = String(modelContext.id || modelContext.endpoint || '');
  if (isLocalTtsModel(modelContext)) return false;
  return modelContext.provider === 'local_audio'
    || id.startsWith('local-musicgen')
    || id.startsWith('local-ace');
}

export function resolveLocalAudioEngine(modelContext = {}) {
  if (modelContext.engine) return modelContext.engine;
  const entry = getLocalAudioModelById(modelContext.id || modelContext.endpoint);
  return entry?.engine || 'musicgen';
}

export function resolveLocalAudioModelSize(modelContext = {}) {
  if (modelContext.localAudioModel) return modelContext.localAudioModel;
  const entry = getLocalAudioModelById(modelContext.id || modelContext.endpoint);
  return entry?.localAudioModel || 'medium';
}

export async function generateLocalAudio(modelContext, payload, host) {
  const baseHost = normalizeLocalAudioHost(host);
  const engine = resolveLocalAudioEngine(modelContext);
  const model = resolveLocalAudioModelSize(modelContext);

  const prompt = String(
    payload.prompt || payload.style || payload.title || ''
  ).trim();
  if (!prompt) throw new Error('El prompt o estilo es obligatorio.');

  const duration = Number(payload.duration) || 30;
  const body = {
    engine,
    model,
    prompt,
    duration,
    style: payload.style || undefined,
    instrumental: payload.instrumental !== false,
  };

  const paths = ['/v1/audio/generate', '/v1/generate', '/generate'];
  let lastError = null;

  for (const path of paths) {
    try {
      const response = await localAudioFetch(path, {
        host: baseHost,
        method: 'POST',
        body,
        timeoutMs: 600000,
      });
      if (!response.ok) {
        const errText = await response.text();
        lastError = new Error(`Audio local (${response.status}): ${errText.slice(0, 200)}`);
        continue;
      }
      const data = await response.json();
      const b64 = data.audio_base64 || data.audio || data.output?.audio_base64;
      const mime = data.mime_type || data.content_type || 'audio/wav';
      const directUrl = data.url || data.output?.url;

      if (directUrl) {
        return { status: 'completed', url: directUrl, outputs: [directUrl], engine, model };
      }
      if (b64) {
        const raw = String(b64).replace(/^data:audio\/\w+;base64,/, '');
        const dataUrl = `data:${mime};base64,${raw}`;
        return { status: 'completed', url: dataUrl, outputs: [dataUrl], engine, model };
      }
      lastError = new Error('El servidor de audio no devolvió audio_base64 ni url.');
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error(
    'No se pudo conectar al servidor de audio local. '
    + 'Ejecuta: python scripts/local_audio_server.py'
  );
}
