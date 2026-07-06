/**
 * Adaptador XTTS v2 — TTS / clonación de voz local.
 * POST /v1/tts/synthesize → { audio_base64, mime_type? }
 */

import { getLocalTtsModelById } from '@/src/lib/localTtsModels.js';
import { localAudioFetch, normalizeLocalAudioHost } from '@/src/lib/providers/localAudioShared';

export function isLocalTtsModel(modelContext = {}) {
  const id = String(modelContext.id || modelContext.endpoint || '');
  return modelContext.kind === 'tts'
    || modelContext.modelKind === 'tts'
    || id.startsWith('local-xtts')
    || modelContext.engine === 'xtts';
}

export async function generateXtts(modelContext, payload, host) {
  const baseHost = normalizeLocalAudioHost(host);
  const entry = getLocalTtsModelById(modelContext.id || modelContext.endpoint);

  const text = String(payload.text || payload.prompt || '').trim();
  if (!text) throw new Error('El texto a sintetizar es obligatorio.');

  const language = payload.language || entry?.inputs?.language?.default || 'es';
  const body = {
    engine: 'xtts',
    model: modelContext.localAudioModel || entry?.localAudioModel || 'xtts_v2',
    text,
    language,
    speaker_wav_base64: payload.speaker_wav_base64 || undefined,
    speaker_wav_url: payload.speaker_wav_url || undefined,
  };

  const paths = ['/v1/tts/synthesize', '/v1/audio/tts', '/tts/synthesize'];
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
        lastError = new Error(`XTTS (${response.status}): ${errText.slice(0, 240)}`);
        continue;
      }
      const data = await response.json();
      const b64 = data.audio_base64 || data.audio || data.output?.audio_base64;
      const mime = data.mime_type || data.content_type || 'audio/wav';
      const directUrl = data.url || data.output?.url;

      if (directUrl) {
        return {
          status: 'completed',
          url: directUrl,
          outputs: [directUrl],
          engine: 'xtts',
          language,
        };
      }
      if (b64) {
        const raw = String(b64).replace(/^data:audio\/\w+;base64,/, '');
        const dataUrl = `data:${mime};base64,${raw}`;
        return {
          status: 'completed',
          url: dataUrl,
          outputs: [dataUrl],
          engine: 'xtts',
          language,
        };
      }
      lastError = new Error('XTTS no devolvió audio.');
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error(
    'No se pudo conectar al servidor XTTS. Instala Coqui TTS: pip install TTS '
    + 'y reinicia python scripts/local_audio_server.py'
  );
}
