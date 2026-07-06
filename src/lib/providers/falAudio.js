/**
 * Adaptador fal.ai — música/ audio (mapeo desde modelos Suno).
 * Usa sonauto, MiniMax Music y ElevenLabs en fal.ai con FAL_KEY.
 */

import { falQueueRun } from '@/src/lib/providers/falShared';

const AUDIO_KINDS = new Set(['audio', 'lipsync']);

const APP_TO_FAL_AUDIO = {
  'suno-create-music': 'sonauto/v2/text-to-music',
  'suno-remix-music': 'sonauto/v2/text-to-music',
  'suno-extend-music': 'fal-ai/minimax-music/v2.6',
  'suno-generate-sounds': 'fal-ai/elevenlabs/music',
  'suno-add-vocals': 'fal-ai/minimax-music/v2.6',
  'suno-add-instrumental': 'fal-ai/minimax-music/v2.6',
  'suno-generate-mashup': 'sonauto/v2/text-to-music',
};

function resolveFalAudioEndpointHeuristic(modelId) {
  const id = String(modelId || '').toLowerCase();
  if (/voice-clone/.test(id)) return null;
  if (/generate-sounds|sounds/.test(id)) return 'fal-ai/elevenlabs/music';
  if (/extend|add-vocals|add-instrumental/.test(id)) return 'fal-ai/minimax-music/v2.6';
  if (/suno|music|mashup|remix/.test(id)) return 'sonauto/v2/text-to-music';
  return null;
}

export function resolveFalAudioEndpoint(modelContext) {
  const id = modelContext?.id;
  const endpoint = modelContext?.endpoint;
  if (id && APP_TO_FAL_AUDIO[id]) return APP_TO_FAL_AUDIO[id];
  if (endpoint && APP_TO_FAL_AUDIO[endpoint]) return APP_TO_FAL_AUDIO[endpoint];
  return resolveFalAudioEndpointHeuristic(id || endpoint);
}

export function isSunoModel(modelContext) {
  if (!modelContext) return false;
  if (modelContext.provider !== 'suno') return false;
  if (!AUDIO_KINDS.has(modelContext.kind)) return false;
  return Boolean(resolveFalAudioEndpoint(modelContext));
}

function buildStyleTags(payload) {
  const style = String(payload.style || '').trim();
  return style ? [style] : [];
}

function buildSonautoInput(modelContext, payload) {
  const input = {};
  const styleTags = buildStyleTags(payload);
  const lyrics = String(payload.prompt || '').trim();
  const title = String(payload.title || '').trim();

  if (styleTags.length) input.tags = styleTags;
  if (lyrics) input.lyrics_prompt = lyrics;
  if (title || styleTags.length) {
    input.prompt = [styleTags.join(', '), title].filter(Boolean).join(' — ');
  } else if (lyrics) {
    input.prompt = lyrics.slice(0, 500);
  }

  if (payload.seed != null && payload.seed !== '') input.seed = Number(payload.seed);
  return input;
}

function buildMinimaxMusicInput(modelContext, payload) {
  const input = {};
  const lyrics = String(payload.prompt || '').trim();
  const style = String(payload.style || '').trim();

  if (lyrics) input.lyrics = lyrics;
  if (style) input.prompt = style;
  if (payload.audio_url) input.reference_audio_url = payload.audio_url;
  if (payload.continue_at != null) input.continue_at = Number(payload.continue_at);

  return input;
}

function buildElevenLabsSfxInput(payload) {
  const prompt = String(payload.prompt || '').trim();
  return {
    prompt,
    force_instrumental: true,
    music_length_ms: Math.min(Math.max(Number(payload.duration || 10) * 1000, 3000), 60000),
  };
}

function buildFalAudioInput(modelContext, payload, falEndpoint) {
  if (falEndpoint.includes('elevenlabs')) {
    return buildElevenLabsSfxInput(payload);
  }
  if (falEndpoint.includes('minimax-music')) {
    return buildMinimaxMusicInput(modelContext, payload);
  }
  return buildSonautoInput(modelContext, payload);
}

export async function generateFalAudio(modelContext, payload, apiKey) {
  const falEndpoint = resolveFalAudioEndpoint(modelContext);
  if (!falEndpoint) {
    throw new Error(
      `Modelo Suno no soportado en ruta directa: ${modelContext.id}. `
      + 'Usa suno-voice-clone vía MuAPI o configura MuAPI.'
    );
  }

  const input = buildFalAudioInput(modelContext, payload, falEndpoint);
  if (!input.prompt && !input.lyrics && !input.lyrics_prompt) {
    throw new Error('Se requiere un prompt para generar audio');
  }

  const result = await falQueueRun(falEndpoint, input, apiKey, {
    maxAttempts: 360,
    interval: 2000,
  });

  return {
    ...result,
    provider: 'suno',
    model: modelContext.id,
    fal_endpoint: falEndpoint,
    fal_routing: true,
  };
}
