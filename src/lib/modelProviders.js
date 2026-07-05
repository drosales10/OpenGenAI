/**
 * Inferencia del proveedor upstream para cada modelo.
 * Permite enrutar a APIs directas (Google, OpenAI, fal…) en lugar de MuAPI.
 */

const PROVIDER_META = {
  google: {
    id: 'google',
    label: 'Google AI / Gemini 3.x',
    labelEs: 'Google AI / Gemini 3.x',
    description: 'Imagen: gemini-3.1-flash-image y gemini-3-pro-image. Video: Veo 3.1 (con audio).',
    descriptionEs: 'Imagen: gemini-3.1-flash-image y gemini-3-pro-image. Video: Veo 3.1 (con audio).',
    docsUrl: 'https://aistudio.google.com/apikey',
    supportsDirect: true,
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    labelEs: 'OpenAI',
    docsUrl: 'https://platform.openai.com/api-keys',
    supportsDirect: false,
  },
  fal: {
    id: 'fal',
    label: 'fal.ai',
    labelEs: 'fal.ai',
    docsUrl: 'https://fal.ai/dashboard/keys',
    supportsDirect: false,
  },
  replicate: {
    id: 'replicate',
    label: 'Replicate',
    labelEs: 'Replicate',
    docsUrl: 'https://replicate.com/account/api-tokens',
    supportsDirect: false,
  },
  minimax: {
    id: 'minimax',
    label: 'MiniMax',
    labelEs: 'MiniMax',
    docsUrl: 'https://www.minimaxi.com',
    supportsDirect: false,
  },
  kling: {
    id: 'kling',
    label: 'Kling AI',
    labelEs: 'Kling AI',
    docsUrl: 'https://klingai.com',
    supportsDirect: false,
  },
  ideogram: {
    id: 'ideogram',
    label: 'Ideogram',
    labelEs: 'Ideogram',
    docsUrl: 'https://ideogram.ai',
    supportsDirect: false,
  },
  midjourney: {
    id: 'midjourney',
    label: 'Midjourney',
    labelEs: 'Midjourney',
    supportsDirect: false,
  },
  bytedance: {
    id: 'bytedance',
    label: 'ByteDance / Seedance',
    labelEs: 'ByteDance / Seedance',
    supportsDirect: false,
  },
  suno: {
    id: 'suno',
    label: 'Suno',
    labelEs: 'Suno',
    supportsDirect: false,
  },
  runway: {
    id: 'runway',
    label: 'Runway',
    labelEs: 'Runway',
    supportsDirect: false,
  },
  wan: {
    id: 'wan',
    label: 'Wan AI',
    labelEs: 'Wan AI',
    supportsDirect: false,
  },
  muapi: {
    id: 'muapi',
    label: 'MuAPI (agregador)',
    labelEs: 'MuAPI (agregador)',
    docsUrl: 'https://muapi.ai/access-keys',
    supportsDirect: false,
  },
};

export function getProviderMeta(providerId) {
  return PROVIDER_META[providerId] || PROVIDER_META.muapi;
}

export function inferProviderForModel(model = {}) {
  const id = String(model.id || '').toLowerCase();
  const family = String(model.family || '').toLowerCase();
  const endpoint = String(model.endpoint || id).toLowerCase();
  const name = String(model.name || '').toLowerCase();
  const haystack = `${id} ${family} ${endpoint} ${name}`;

  if (
    /google|imagen|veo|gemini|nano-banana/.test(haystack)
  ) {
    return 'google';
  }
  if (/openai|sora|gpt-image|gpt-4o-image|dall-e|dalle/.test(haystack)) {
    return 'openai';
  }
  if (/^flux|kontext|flux-/.test(id) || family === 'flux' || family === 'kontext') {
    return 'fal';
  }
  if (/minimax|hailuo/.test(haystack)) {
    return 'minimax';
  }
  if (/kling/.test(haystack)) {
    return 'kling';
  }
  if (/ideogram/.test(haystack)) {
    return 'ideogram';
  }
  if (/midjourney/.test(haystack)) {
    return 'midjourney';
  }
  if (/seedance|seedream|bytedance/.test(haystack)) {
    return 'bytedance';
  }
  if (/suno/.test(haystack)) {
    return 'suno';
  }
  if (/runway/.test(haystack)) {
    return 'runway';
  }
  if (/\bwan[-\d]|wan2|wan22/.test(haystack)) {
    return 'wan';
  }
  if (/sdxl|stable-diffusion|stability/.test(haystack)) {
    return 'replicate';
  }

  return 'muapi';
}

export function listKnownProviders() {
  return Object.values(PROVIDER_META);
}

export { PROVIDER_META };
