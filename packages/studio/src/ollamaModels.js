/**
 * Modelos de imagen servidos por Ollama (inferencia local).
 * @see https://ollama.com/blog/image-generation
 */

const OLLAMA_AR = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3'];

function ollamaT2i(id, name, ollamaTag, extra = {}) {
  return {
    id,
    name,
    endpoint: id,
    provider: 'ollama',
    family: extra.family || 'ollama',
    ollamaModel: ollamaTag,
    tags: ['local', 'ollama', 'open-source', ...(extra.tags || [])],
    inputs: {
      prompt: {
        type: 'string',
        title: 'Prompt',
        name: 'prompt',
        description: 'Descripción de la imagen a generar.',
      },
      aspect_ratio: {
        type: 'string',
        title: 'Aspect Ratio',
        name: 'aspect_ratio',
        enum: OLLAMA_AR,
        default: '1:1',
        description: 'Relación de aspecto.',
      },
      width: {
        type: 'int',
        title: 'Width',
        name: 'width',
        default: 1024,
        minValue: 512,
        maxValue: 1536,
        step: 64,
      },
      height: {
        type: 'int',
        title: 'Height',
        name: 'height',
        default: 1024,
        minValue: 512,
        maxValue: 1536,
        step: 64,
      },
    },
    ...extra,
  };
}

export const ollamaT2iModels = [
  ollamaT2i(
    'ollama-z-image-turbo',
    'Z-Image Turbo (Ollama)',
    'x/z-image-turbo',
    {
      family: 'z-image',
      description: 'Fotorrealismo y texto bilingüe EN/ZH. ~13 GB fp8. Apache 2.0.',
      tags: ['photorealistic', 'featured'],
      featured: true,
    }
  ),
  ollamaT2i(
    'ollama-flux2-klein-4b',
    'FLUX.2 Klein 4B (Ollama)',
    'x/flux2-klein:4b',
    {
      family: 'flux',
      description: 'Rápido, texto legible, uso comercial. ~5.7 GB. Apache 2.0.',
      tags: ['fast', 'featured'],
      featured: true,
    }
  ),
  ollamaT2i(
    'ollama-flux2-klein-9b',
    'FLUX.2 Klein 9B (Ollama)',
    'x/flux2-klein:9b',
    {
      family: 'flux',
      description: 'Mayor calidad Flux Klein. ~12 GB. Licencia no comercial.',
      tags: ['quality'],
    }
  ),
  ollamaT2i(
    'ollama-flux2-klein-4b-fp8',
    'FLUX.2 Klein 4B fp8 (Ollama)',
    'x/flux2-klein:4b-fp8',
    {
      family: 'flux',
      description: 'Versión cuantizada fp8 del Klein 4B — menos VRAM.',
      tags: ['fast', 'low-vram'],
    }
  ),
];

export function getOllamaModelById(id) {
  return ollamaT2iModels.find((m) => m.id === id) || null;
}

export function isOllamaModelId(id) {
  return String(id || '').startsWith('ollama-') || getOllamaModelById(id) != null;
}
