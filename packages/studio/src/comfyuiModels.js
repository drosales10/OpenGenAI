/**
 * Catálogo ComfyUI — backend universal imagen / video / audio.
 * Requiere ComfyUI en ejecución con los nodos indicados por modelo.
 */

const AR = ['1:1', '16:9', '9:16', '4:3', '3:4'];

function comfyModel(id, name, kind, workflow, extra = {}) {
  return {
    id,
    name,
    endpoint: id,
    provider: 'comfyui',
    family: 'comfyui',
    kind,
    workflow,
    description: extra.description || '',
    tags: ['local', 'comfyui', 'open-source', kind, ...(extra.tags || [])],
    inputs: extra.inputs || {
      prompt: {
        type: 'string',
        title: 'Prompt',
        name: 'prompt',
      },
      aspect_ratio: {
        type: 'string',
        title: 'Aspect Ratio',
        name: 'aspect_ratio',
        enum: AR,
        default: '1:1',
      },
      negative_prompt: {
        type: 'string',
        title: 'Negative Prompt',
        name: 'negative_prompt',
        default: '',
      },
    },
    ...extra,
  };
}

export const comfyuiT2iModels = [
  comfyModel(
    'comfy-sdxl-t2i',
    'SDXL (ComfyUI)',
    't2i',
    'sdxl_t2i',
    {
      description: 'Text-to-image con CheckpointLoader SDXL. Checkpoint configurable vía COMFYUI_SDXL_CHECKPOINT.',
      featured: true,
      checkpoint: 'sd_xl_base_1.0.safetensors',
    }
  ),
  comfyModel(
    'comfy-flux-t2i',
    'Flux Dev (ComfyUI)',
    't2i',
    'flux_t2i',
    {
      description: 'Flux vía UNETLoader + DualCLIPLoader. Requiere nodos Flux en ComfyUI.',
      checkpoint: 'flux1-dev.safetensors',
    }
  ),
];

export const comfyuiI2iModels = [
  comfyModel(
    'comfy-sdxl-i2i',
    'SDXL img2img (ComfyUI)',
    'i2i',
    'sdxl_i2i',
    {
      description: 'Image-to-image SDXL con LoadImage + KSampler.',
      checkpoint: 'sd_xl_base_1.0.safetensors',
      needsImage: true,
    }
  ),
];

export const comfyuiT2vModels = [
  comfyModel(
    'comfy-wan-t2v',
    'Wan 2.2 T2V (ComfyUI)',
    't2v',
    'wan_t2v',
    {
      description: 'Text-to-video Wan. Instala nodos WanVideo en ComfyUI.',
      inputs: {
        prompt: { type: 'string', title: 'Prompt', name: 'prompt' },
        aspect_ratio: {
          type: 'string',
          title: 'Aspect Ratio',
          name: 'aspect_ratio',
          enum: ['16:9', '1:1', '9:16'],
          default: '16:9',
        },
      },
    }
  ),
  comfyModel(
    'comfy-ltx-t2v',
    'LTX Video (ComfyUI)',
    't2v',
    'ltx_t2v',
    {
      description: 'LTX text-to-video vía nodos LTX-Video en ComfyUI.',
      inputs: {
        prompt: { type: 'string', title: 'Prompt', name: 'prompt' },
        aspect_ratio: {
          type: 'string',
          title: 'Aspect Ratio',
          name: 'aspect_ratio',
          enum: ['16:9', '1:1', '9:16'],
          default: '16:9',
        },
      },
    }
  ),
];

export const comfyuiAudioModels = [
  comfyModel(
    'comfy-musicgen-t2a',
    'MusicGen (ComfyUI)',
    'audio',
    'musicgen_t2a',
    {
      description: 'Música desde prompt. Requiere nodos AudioCraft/MusicGen en ComfyUI.',
      inputs: {
        prompt: { type: 'string', title: 'Prompt', name: 'prompt' },
        duration: {
          type: 'int',
          title: 'Duration',
          name: 'duration',
          default: 30,
          minValue: 5,
          maxValue: 120,
        },
      },
    }
  ),
  comfyModel(
    'comfy-ace-step-t2a',
    'ACE-Step (ComfyUI)',
    'audio',
    'ace_step_t2a',
    {
      description: 'Música estructurada ACE-Step si el nodo está instalado en ComfyUI.',
      inputs: {
        prompt: { type: 'string', title: 'Prompt', name: 'prompt' },
        style: { type: 'string', title: 'Style', name: 'style', default: '' },
      },
    }
  ),
];

export const COMFYUI_ALL_MODELS = [
  ...comfyuiT2iModels,
  ...comfyuiI2iModels,
  ...comfyuiT2vModels,
  ...comfyuiAudioModels,
];

export function getComfyuiModelById(id) {
  return COMFYUI_ALL_MODELS.find((m) => m.id === id) || null;
}

export function isComfyuiModelId(id) {
  return String(id || '').startsWith('comfy-');
}
