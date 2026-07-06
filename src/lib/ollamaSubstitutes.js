/**
 * Mapeo de modelos de pago → alternativas open source (Ollama, sd.cpp, Wan2GP).
 * Fuente de verdad para recomendaciones en Settings y documentación.
 */

export const OLLAMA_PULL_COMMANDS = [
  {
    id: 'z-image-turbo',
    ollamaTag: 'x/z-image-turbo',
    pull: 'ollama pull x/z-image-turbo',
    size: '~13 GB (fp8)',
    license: 'Apache 2.0',
    platform: 'macOS (exp.; Win/Linux próximamente)',
  },
  {
    id: 'flux2-klein-4b',
    ollamaTag: 'x/flux2-klein:4b',
    pull: 'ollama pull x/flux2-klein:4b',
    size: '~5.7 GB',
    license: 'Apache 2.0',
    platform: 'macOS (exp.)',
  },
  {
    id: 'flux2-klein-9b',
    ollamaTag: 'x/flux2-klein:9b',
    pull: 'ollama pull x/flux2-klein:9b',
    size: '~12 GB',
    license: 'FLUX Non-Commercial v2.1',
    platform: 'macOS (exp.)',
  },
  {
    id: 'flux2-klein-4b-fp8',
    ollamaTag: 'x/flux2-klein:4b-fp8',
    pull: 'ollama pull x/flux2-klein:4b-fp8',
    size: 'menor que 4b full',
    license: 'Apache 2.0',
    platform: 'macOS (exp.)',
  },
];

/** Sustitutos por familia / endpoint de la app */
export const PAID_TO_OPEN_SOURCE = [
  {
    paidFamily: 'Google / Gemini / Nano Banana',
    paidExamples: ['nano-banana', 'gemini-3-pro-image', 'veo-3'],
    substitutes: [
      { engine: 'ollama', model: 'x/z-image-turbo', appModel: 'ollama-z-image-turbo', pull: 'ollama pull x/z-image-turbo', note: 'Imagen fotorrealista + texto bilingüe' },
      { engine: 'ollama', model: 'x/flux2-klein:4b', appModel: 'ollama-flux2-klein-4b', pull: 'ollama pull x/flux2-klein:4b', note: 'Más rápido, buen texto en imagen' },
      { engine: 'sdcpp', model: 'z-image-turbo', appModel: 'z-image-turbo', pull: 'Descargar en Settings → Local Models (Electron)', note: 'Sin Ollama, vía sd.cpp' },
    ],
    videoNote: 'Veo no tiene equivalente en Ollama. Usa Wan2GP: wan22-t2v, hunyuan-video o ltx-video.',
  },
  {
    paidFamily: 'OpenAI (GPT Image / DALL·E / Sora)',
    paidExamples: ['gpt-image-1.5', 'gpt-image-2', 'sora-2'],
    substitutes: [
      { engine: 'ollama', model: 'x/flux2-klein:4b', appModel: 'ollama-flux2-klein-4b', pull: 'ollama pull x/flux2-klein:4b', note: 'Imagen general' },
      { engine: 'ollama', model: 'x/z-image-turbo', appModel: 'ollama-z-image-turbo', pull: 'ollama pull x/z-image-turbo', note: 'Fotorrealismo' },
    ],
    videoNote: 'Sora → Wan2GP wan22 / LTX Video, o ComfyUI + Wan 2.x.',
  },
  {
    paidFamily: 'Flux (fal / MuAPI)',
    paidExamples: ['flux-dev', 'flux-schnell', 'flux-2-klein-4b'],
    substitutes: [
      { engine: 'ollama', model: 'x/flux2-klein:4b', appModel: 'ollama-flux2-klein-4b', pull: 'ollama pull x/flux2-klein:4b', note: 'Equivalente directo Klein 4B' },
      { engine: 'ollama', model: 'x/flux2-klein:9b', appModel: 'ollama-flux2-klein-9b', pull: 'ollama pull x/flux2-klein:9b', note: 'Mayor calidad (no comercial)' },
      { engine: 'wan2gp', model: 'flux-dev', appModel: 'wan2gp:flux-dev', pull: 'Servidor Wan2GP + pesos Flux.1 dev', note: 'Flux.1 dev completo (Electron)' },
    ],
  },
  {
    paidFamily: 'Ideogram v3',
    paidExamples: ['ideogram-v3', 'ideogram-character'],
    substitutes: [
      { engine: 'ollama', model: 'x/flux2-klein:4b', appModel: 'ollama-flux2-klein-4b', pull: 'ollama pull x/flux2-klein:4b', note: 'Texto en imagen (inferior a Ideogram)' },
      { engine: 'wan2gp', model: 'qwen-image', appModel: 'wan2gp:qwen-image', pull: 'Wan2GP + Qwen-Image', note: 'Buen texto y estilo' },
    ],
  },
  {
    paidFamily: 'SDXL / Stable Diffusion',
    paidExamples: ['sdxl', 'stable-diffusion-xl'],
    substitutes: [
      { engine: 'ollama', model: 'x/z-image-turbo', appModel: 'ollama-z-image-turbo', pull: 'ollama pull x/z-image-turbo', note: 'Calidad superior a SDXL clásico' },
      { engine: 'sdcpp', model: 'stable-diffusion-xl-base', appModel: 'stable-diffusion-xl-base', pull: 'Settings → Local Models', note: 'SDXL oficial en sd.cpp' },
      { engine: 'sdcpp', model: 'dreamshaper-8', appModel: 'dreamshaper-8', pull: 'Settings → Local Models', note: 'SD 1.5 ligero' },
    ],
  },
  {
    paidFamily: 'Kling / MiniMax Hailuo',
    paidExamples: ['kling-v2', 'hailuo-02'],
    substitutes: [
      { engine: 'wan2gp', model: 'wan22-t2v', appModel: 'wan2gp:wan22-t2v', pull: 'Wan2GP + Wan 2.2', note: 'No disponible en Ollama' },
      { engine: 'wan2gp', model: 'wan22-i2v', appModel: 'wan2gp:wan22-i2v', pull: 'Wan2GP + Wan 2.2 I2V', note: 'Imagen a video' },
    ],
    videoNote: 'Ollama no genera video aún.',
  },
  {
    paidFamily: 'Seedance / ByteDance',
    paidExamples: ['seedance-lite', 'seedance-pro'],
    substitutes: [
      { engine: 'wan2gp', model: 'wan22-t2v', appModel: 'wan2gp:wan22-t2v', pull: 'Wan2GP', note: 'Alternativa open video' },
      { engine: 'wan2gp', model: 'ltx-video', appModel: 'wan2gp:ltx-video', pull: 'Wan2GP + LTX', note: 'Más rápido en GPU consumer' },
    ],
  },
  {
    paidFamily: 'Wan AI',
    paidExamples: ['wan-2.2', 'wan-2.6'],
    substitutes: [
      { engine: 'wan2gp', model: 'wan22-t2v', appModel: 'wan2gp:wan22-t2v', pull: 'Wan2GP', note: 'Mismo ecosistema Wan open weights' },
      { engine: 'ollama', model: 'x/z-image-turbo', appModel: 'ollama-z-image-turbo', pull: 'ollama pull x/z-image-turbo', note: 'Solo imagen Wan-like (Z-Image)' },
    ],
  },
  {
    paidFamily: 'Runway Gen-3',
    paidExamples: ['runway-gen3'],
    substitutes: [
      { engine: 'wan2gp', model: 'ltx-video', appModel: 'wan2gp:ltx-video', pull: 'Wan2GP + LTX Video', note: 'Rápido y local' },
      { engine: 'wan2gp', model: 'hunyuan-video', appModel: 'wan2gp:hunyuan-video', pull: 'Wan2GP + Hunyuan', note: 'Mayor calidad, más VRAM' },
    ],
  },
  {
    paidFamily: 'Suno / música',
    paidExamples: ['suno-v4', 'minimax-music'],
    substitutes: [
      { engine: 'other', model: 'ACE-Step / MusicGen', appModel: null, pull: 'Hugging Face: facebook/musicgen-small o ace-step', note: 'Ollama no tiene música; usar ComfyUI o HF' },
    ],
  },
  {
    paidFamily: 'Midjourney',
    paidExamples: ['midjourney-v6'],
    substitutes: [
      { engine: 'ollama', model: 'x/flux2-klein:9b', appModel: 'ollama-flux2-klein-9b', pull: 'ollama pull x/flux2-klein:9b', note: 'Estilo artístico aproximado' },
      { engine: 'wan2gp', model: 'flux-dev', appModel: 'wan2gp:flux-dev', pull: 'Wan2GP Flux dev', note: 'Sin API Midjourney' },
    ],
  },
  {
    paidFamily: 'Agentes LLM (Design Agent / chat)',
    paidExamples: ['gpt-4o', 'gemini-pro'],
    substitutes: [
      { engine: 'ollama', model: 'llama3.3', appModel: null, pull: 'ollama pull llama3.3', note: 'Chat general' },
      { engine: 'ollama', model: 'qwen2.5:14b', appModel: null, pull: 'ollama pull qwen2.5:14b', note: 'Multilingüe, código' },
      { engine: 'ollama', model: 'mistral', appModel: null, pull: 'ollama pull mistral', note: 'Rápido en CPU/GPU modesta' },
    ],
  },
];

export function buildSubstitutesResponse(lang = 'es') {
  const useEs = lang === 'es' || lang.startsWith('zh');
  return {
    ollamaPullCommands: OLLAMA_PULL_COMMANDS,
    mappings: PAID_TO_OPEN_SOURCE.map((row) => ({
      ...row,
      label: row.paidFamily,
      substitutes: row.substitutes.map((s) => ({
        ...s,
        engineLabel: {
          ollama: 'Ollama',
          sdcpp: 'sd.cpp (Electron)',
          wan2gp: 'Wan2GP (Electron)',
          other: useEs ? 'Otro' : 'Other',
        }[s.engine] || s.engine,
      })),
    })),
    notes: useEs
      ? [
          'La generación de imagen en Ollama es experimental y hoy funciona principalmente en macOS.',
          'Video y música no están en Ollama; usa Wan2GP (Electron) o ComfyUI.',
          'Instala Ollama desde https://ollama.com y define OLLAMA_HOST en .env (por defecto http://127.0.0.1:11434).',
        ]
      : [
          'Ollama image generation is experimental and mainly macOS today.',
          'Video and music are not in Ollama; use Wan2GP (Electron) or ComfyUI.',
          'Install Ollama from https://ollama.com and set OLLAMA_HOST in .env (default http://127.0.0.1:11434).',
        ],
  };
}

export function resolveOllamaTagForAppModel(modelId) {
  const id = String(modelId || '');
  const fromCatalog = PAID_TO_OPEN_SOURCE.flatMap((r) => r.substitutes)
    .find((s) => s.appModel === id);
  if (fromCatalog?.model) return fromCatalog.model;

  const map = {
    'ollama-z-image-turbo': 'x/z-image-turbo',
    'ollama-flux2-klein-4b': 'x/flux2-klein:4b',
    'ollama-flux2-klein-9b': 'x/flux2-klein:9b',
    'ollama-flux2-klein-4b-fp8': 'x/flux2-klein:4b-fp8',
  };
  return map[id] || null;
}
