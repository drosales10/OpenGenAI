/**
 * Wan AI Effects (MuAPI: generate_wan_ai_effects) → fal-ai/wan-effects
 * @see https://fal.ai/models/fal-ai/wan-effects
 */

import { falQueueRun } from '@/src/lib/providers/falShared';

const FAL_WAN_EFFECTS_ENDPOINT = 'fal-ai/wan-effects';

const MUAPI_ONLY_MODEL_IDS = new Set(['motion-controls', 'vfx']);

const EFFECT_NAME_TO_FAL = {
  '360 Rotation': 'rotate',
  'Angry': 'angry-face',
  'Assassin It': 'assassin',
  'Baby It': 'baby',
  'Boxing': 'muscle',
  'Bride It': 'bride',
  'Cakeify': 'cakeify',
  'Cartoon Jaw Drop': 'cartoon-jaw-drop',
  'Crush It': 'crush',
  'Crying': 'crying',
  'Deflate It': 'deflate',
  'Disney Princess It': 'disney-princess',
  'Fire': 'fire',
  'Gun Reveal': 'gun-shooting',
  'Hug Jesus': 'hug-jesus',
  'Hulk Transformation': 'hulk',
  'Inflate It': 'inflate',
  'Jungle It': 'jungle',
  'Jumpscare': 'jumpscare',
  'Kamehameha': 'super-saiyan',
  'Kissing': 'kissing',
  'Laughing': 'laughing',
  'Mona Lisa It': 'mona-lisa',
  'Muscle Show Off': 'muscle',
  'Museum It': 'painting',
  'Pirate Captain': 'pirate-captain',
  'Princess It': 'princess',
  'Puppy it': 'puppy',
  'Robotic Face Reveal': 'robot-face-reveal',
  'Samurai It': 'samurai',
  'Sharingan Eyes': 'animeify',
  'Skyrim Fus-Ro-Dah': 'fus-ro-dah',
  'Snow White It': 'snow-white',
  'Squish It': 'squish',
};

function slugifyEffectName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+it$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function mapMuapiEffectToFal(effectName) {
  if (!effectName) return 'cakeify';
  if (EFFECT_NAME_TO_FAL[effectName]) return EFFECT_NAME_TO_FAL[effectName];
  const slug = slugifyEffectName(effectName);
  return slug || 'cakeify';
}

export function isFalWanEffectsModel(modelContext) {
  if (!modelContext) return false;
  if ((modelContext.endpoint || '') !== 'generate_wan_ai_effects') return false;
  if (MUAPI_ONLY_MODEL_IDS.has(modelContext.id)) return false;
  return true;
}

function normalizeAspectRatio(value) {
  const ratio = String(value || '16:9').trim();
  if (ratio === '9:16') return '9:16';
  if (ratio === '1:1') return '1:1';
  return '16:9';
}

function normalizeDurationToFrames(duration) {
  const seconds = Number.parseInt(String(duration ?? ''), 10);
  if (seconds === 10) return 100;
  return 81;
}

export async function generateFalWanEffects(modelContext, payload, apiKey) {
  const imageUrl = payload.image_url || payload.images_list?.[0];
  if (!imageUrl) {
    throw new Error('Se requiere una imagen para aplicar el efecto');
  }

  const subject = String(payload.prompt || payload.subject || 'subject').trim() || 'subject';
  const effectType = mapMuapiEffectToFal(payload.name);

  const input = {
    subject,
    image_url: imageUrl,
    effect_type: effectType,
    aspect_ratio: normalizeAspectRatio(payload.aspect_ratio),
    num_frames: normalizeDurationToFrames(payload.duration),
  };

  if (payload.seed != null && payload.seed !== '' && payload.seed !== -1) {
    input.seed = Number(payload.seed);
  }
  if (String(payload.quality || '').toLowerCase() === 'high') {
    input.num_inference_steps = 40;
  }

  const result = await falQueueRun(FAL_WAN_EFFECTS_ENDPOINT, input, apiKey, {
    maxAttempts: 360,
    interval: 2000,
  });

  return {
    ...result,
    provider: 'wan',
    model: modelContext.id,
    fal_endpoint: FAL_WAN_EFFECTS_ENDPOINT,
    fal_effect_type: effectType,
  };
}
