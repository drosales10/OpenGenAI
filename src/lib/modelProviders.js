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
    description: 'Imagen: gpt-image-1.5 / gpt-image-2. Video: Sora 2 / Sora 2 Pro.',
    descriptionEs: 'Imagen: gpt-image-1.5 / gpt-image-2. Video: Sora 2 / Sora 2 Pro.',
    docsUrl: 'https://platform.openai.com/api-keys',
    supportsDirect: true,
  },
  fal: {
    id: 'fal',
    label: 'fal.ai',
    labelEs: 'fal.ai',
    description: 'Imagen: Flux. Video: Kling, Hailuo, Seedance, Wan, Runway. Música: Suno→fal.',
    descriptionEs: 'Imagen: Flux. Video: Kling, Hailuo, Seedance, Wan, Runway. Música: Suno→fal.',
    docsUrl: 'https://fal.ai/dashboard/keys',
    supportsDirect: true,
  },
  replicate: {
    id: 'replicate',
    label: 'Replicate',
    labelEs: 'Replicate',
    description: 'Imagen SDXL vía Replicate API o fal-ai/fast-sdxl con FAL_KEY.',
    descriptionEs: 'Imagen SDXL vía Replicate API o fal-ai/fast-sdxl con FAL_KEY.',
    docsUrl: 'https://replicate.com/account/api-tokens',
    supportsDirect: true,
  },
  minimax: {
    id: 'minimax',
    label: 'MiniMax',
    labelEs: 'MiniMax',
    description: 'Video Hailuo 02 / 2.3 (t2v, i2v) vía fal.ai con FAL_KEY.',
    descriptionEs: 'Video Hailuo 02 / 2.3 (t2v, i2v) vía fal.ai con FAL_KEY.',
    docsUrl: 'https://fal.ai/models/fal-ai/minimax/hailuo-2.3/pro/text-to-video',
    supportsDirect: true,
  },
  kling: {
    id: 'kling',
    label: 'Kling AI',
    labelEs: 'Kling AI',
    description: 'Video Kling v2.1–v3 / O1 (t2v, i2v) vía fal.ai con FAL_KEY.',
    descriptionEs: 'Video Kling v2.1–v3 / O1 (t2v, i2v) vía fal.ai con FAL_KEY.',
    docsUrl: 'https://fal.ai/explore/kling',
    supportsDirect: true,
  },
  ideogram: {
    id: 'ideogram',
    label: 'Ideogram',
    labelEs: 'Ideogram',
    description: 'Imagen: Ideogram v3 (generate, character, reframe).',
    descriptionEs: 'Imagen: Ideogram v3 (generate, character, reframe).',
    docsUrl: 'https://developer.ideogram.ai/',
    supportsDirect: true,
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
    description: 'Video Seedance Lite/Pro/v1.5/v2.0 vía fal.ai con FAL_KEY.',
    descriptionEs: 'Video Seedance Lite/Pro/v1.5/v2.0 vía fal.ai con FAL_KEY.',
    docsUrl: 'https://fal.ai/seedance-2.0',
    supportsDirect: true,
  },
  suno: {
    id: 'suno',
    label: 'Suno',
    labelEs: 'Suno',
    description: 'Música/audio vía fal (sonauto, MiniMax Music, ElevenLabs) con FAL_KEY.',
    descriptionEs: 'Música/audio vía fal (sonauto, MiniMax Music, ElevenLabs) con FAL_KEY.',
    docsUrl: 'https://fal.ai/explore/text-to-music-apis',
    supportsDirect: true,
  },
  runway: {
    id: 'runway',
    label: 'Runway',
    labelEs: 'Runway',
    description: 'Video Gen-3 Turbo vía fal.ai con FAL_KEY.',
    descriptionEs: 'Video Gen-3 Turbo vía fal.ai con FAL_KEY.',
    docsUrl: 'https://fal.ai/models/fal-ai/runway-gen3/turbo/text-to-video',
    supportsDirect: true,
  },
  wan: {
    id: 'wan',
    label: 'Wan AI',
    labelEs: 'Wan AI',
    description: 'Video e imagen Wan 2.x vía fal.ai con FAL_KEY.',
    descriptionEs: 'Video e imagen Wan 2.x vía fal.ai con FAL_KEY.',
    docsUrl: 'https://fal.ai/wan-2.6',
    supportsDirect: true,
  },
  ollama: {
    id: 'ollama',
    label: 'Ollama (local)',
    labelEs: 'Ollama (local)',
    description: 'Imagen open source vía Ollama (Z-Image Turbo, FLUX.2 Klein). Sin clave API.',
    descriptionEs: 'Imagen open source vía Ollama (Z-Image Turbo, FLUX.2 Klein). Sin clave API.',
    docsUrl: 'https://ollama.com/download',
    supportsDirect: true,
  },
  wan2gp: {
    id: 'wan2gp',
    label: 'Wan2GP (local)',
    labelEs: 'Wan2GP (local)',
    description: 'Video e imagen open source vía servidor Wan2GP (Gradio). Sin clave API.',
    descriptionEs: 'Video e imagen open source vía servidor Wan2GP (Gradio). Sin clave API.',
    docsUrl: 'https://github.com/deepbeepmeep/Wan2GP',
    supportsDirect: true,
  },
  local_audio: {
    id: 'local_audio',
    label: 'Audio local',
    labelEs: 'Audio local',
    description: 'Música open source vía MusicGen / ACE-Step (servidor local).',
    descriptionEs: 'Música open source vía MusicGen / ACE-Step (servidor local).',
    docsUrl: 'https://github.com/facebookresearch/audiocraft',
    supportsDirect: true,
  },
  comfyui: {
    id: 'comfyui',
    label: 'ComfyUI (local)',
    labelEs: 'ComfyUI (local)',
    description: 'Backend universal imagen / video / audio vía ComfyUI API.',
    descriptionEs: 'Backend universal imagen / video / audio vía ComfyUI API.',
    docsUrl: 'https://github.com/comfyanonymous/ComfyUI',
    supportsDirect: true,
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
  if (/^ollama-/.test(id) || family === 'ollama') {
    return 'ollama';
  }
  if (/^wan2gp[-:]/.test(id) || model.provider === 'wan2gp') {
    return 'wan2gp';
  }
  if (/^local-xtts/.test(id) || model.modelKind === 'tts') {
    return 'local_audio';
  }
  if (/^comfy-/.test(id) || model.provider === 'comfyui') {
    return 'comfyui';
  }
  if (/^local-musicgen|^local-ace/.test(id) || model.provider === 'local_audio') {
    return 'local_audio';
  }

  return 'muapi';
}

export function listKnownProviders() {
  return Object.values(PROVIDER_META);
}

export { PROVIDER_META };
