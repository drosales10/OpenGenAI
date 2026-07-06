/**
 * Plantillas de workflow ComfyUI (API /prompt).
 * Los checkpoints se resuelven desde env o catálogo del modelo.
 */

const ASPECT_TO_SIZE = {
  '1:1': { width: 1024, height: 1024 },
  '16:9': { width: 1344, height: 768 },
  '9:16': { width: 768, height: 1344 },
  '4:3': { width: 1152, height: 896 },
  '3:4': { width: 896, height: 1152 },
};

export function resolveDimensions(aspectRatio, defaults = { width: 1024, height: 1024 }) {
  const preset = ASPECT_TO_SIZE[aspectRatio] || defaults;
  return { width: preset.width, height: preset.height };
}

function sdxlCheckpoint(modelContext) {
  return (
    process.env.COMFYUI_SDXL_CHECKPOINT
    || modelContext.checkpoint
    || 'sd_xl_base_1.0.safetensors'
  );
}

function fluxCheckpoint(modelContext) {
  return (
    process.env.COMFYUI_FLUX_UNET
    || modelContext.checkpoint
    || 'flux1-dev.safetensors'
  );
}

/** SDXL text-to-image clásico */
export function buildSdxlT2iWorkflow(modelContext, payload) {
  const { width, height } = resolveDimensions(payload.aspect_ratio);
  const seed = payload.seed && payload.seed !== -1
    ? payload.seed
    : Math.floor(Math.random() * 2147483647);
  const ckpt = sdxlCheckpoint(modelContext);
  const prompt = String(payload.prompt || '').trim();
  const negative = String(payload.negative_prompt || payload.negative || '');

  return {
    3: {
      class_type: 'KSampler',
      inputs: {
        seed,
        steps: payload.steps || 25,
        cfg: payload.guidance_scale || payload.cfg || 7.5,
        sampler_name: 'euler',
        scheduler: 'normal',
        denoise: 1,
        model: ['4', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['5', 0],
      },
    },
    4: {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: ckpt },
    },
    5: {
      class_type: 'EmptyLatentImage',
      inputs: { width, height, batch_size: 1 },
    },
    6: {
      class_type: 'CLIPTextEncode',
      inputs: { text: prompt, clip: ['4', 1] },
    },
    7: {
      class_type: 'CLIPTextEncode',
      inputs: { text: negative, clip: ['4', 1] },
    },
    8: {
      class_type: 'VAEDecode',
      inputs: { samples: ['3', 0], vae: ['4', 2] },
    },
    9: {
      class_type: 'SaveImage',
      inputs: { filename_prefix: 'ogai_sdxl', images: ['8', 0] },
    },
  };
}

/** SDXL img2img con imagen subida (filename en input LoadImage) */
export function buildSdxlI2iWorkflow(modelContext, payload, uploadedImageName) {
  const { width, height } = resolveDimensions(payload.aspect_ratio);
  const seed = payload.seed && payload.seed !== -1
    ? payload.seed
    : Math.floor(Math.random() * 2147483647);
  const ckpt = sdxlCheckpoint(modelContext);
  const prompt = String(payload.prompt || '').trim();
  const negative = String(payload.negative_prompt || '');
  const denoise = payload.strength ?? payload.denoise ?? 0.65;

  return {
    4: {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: ckpt },
    },
    10: {
      class_type: 'LoadImage',
      inputs: { image: uploadedImageName },
    },
    11: {
      class_type: 'VAEEncode',
      inputs: { pixels: ['10', 0], vae: ['4', 2] },
    },
    3: {
      class_type: 'KSampler',
      inputs: {
        seed,
        steps: payload.steps || 25,
        cfg: payload.guidance_scale || 7.5,
        sampler_name: 'euler',
        scheduler: 'normal',
        denoise,
        model: ['4', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['11', 0],
      },
    },
    6: {
      class_type: 'CLIPTextEncode',
      inputs: { text: prompt, clip: ['4', 1] },
    },
    7: {
      class_type: 'CLIPTextEncode',
      inputs: { text: negative, clip: ['4', 1] },
    },
    8: {
      class_type: 'VAEDecode',
      inputs: { samples: ['3', 0], vae: ['4', 2] },
    },
    9: {
      class_type: 'SaveImage',
      inputs: { filename_prefix: 'ogai_sdxl_i2i', images: ['8', 0] },
    },
  };
}

/**
 * Flux Dev — requiere nodos UNETLoader, DualCLIPLoader, VAELoader en ComfyUI.
 */
export function buildFluxT2iWorkflow(modelContext, payload) {
  const { width, height } = resolveDimensions(payload.aspect_ratio);
  const seed = payload.seed && payload.seed !== -1
    ? payload.seed
    : Math.floor(Math.random() * 2147483647);
  const unet = fluxCheckpoint(modelContext);
  const prompt = String(payload.prompt || '').trim();

  return {
    12: {
      class_type: 'UNETLoader',
      inputs: { unet_name: unet, weight_dtype: 'default' },
    },
    13: {
      class_type: 'DualCLIPLoader',
      inputs: {
        clip_name1: process.env.COMFYUI_FLUX_CLIP1 || 't5xxl_fp16.safetensors',
        clip_name2: process.env.COMFYUI_FLUX_CLIP2 || 'clip_l.safetensors',
        type: 'flux',
      },
    },
    14: {
      class_type: 'VAELoader',
      inputs: { vae_name: process.env.COMFYUI_FLUX_VAE || 'ae.safetensors' },
    },
    5: {
      class_type: 'EmptyLatentImage',
      inputs: { width, height, batch_size: 1 },
    },
    6: {
      class_type: 'CLIPTextEncode',
      inputs: { text: prompt, clip: ['13', 0] },
    },
    15: {
      class_type: 'ConditioningZeroOut',
      inputs: { conditioning: ['6', 0] },
    },
    3: {
      class_type: 'KSampler',
      inputs: {
        seed,
        steps: payload.steps || 20,
        cfg: payload.guidance_scale || 3.5,
        sampler_name: 'euler',
        scheduler: 'simple',
        denoise: 1,
        model: ['12', 0],
        positive: ['6', 0],
        negative: ['15', 0],
        latent_image: ['5', 0],
      },
    },
    8: {
      class_type: 'VAEDecode',
      inputs: { samples: ['3', 0], vae: ['14', 0] },
    },
    9: {
      class_type: 'SaveImage',
      inputs: { filename_prefix: 'ogai_flux', images: ['8', 0] },
    },
  };
}

/**
 * Wan T2V — plantilla genérica; el usuario debe tener WanVideoSampler o equivalente.
 * Si el nodo no existe, ComfyUI devolverá error claro en object_info.
 */
export function buildWanT2vWorkflow(_modelContext, payload) {
  const prompt = String(payload.prompt || '').trim();
  const { width, height } = resolveDimensions(payload.aspect_ratio || '16:9', {
    width: 832,
    height: 480,
  });

  return {
    20: {
      class_type: 'WanVideoTextEncode',
      inputs: { prompt, model: ['21', 0] },
    },
    21: {
      class_type: 'WanVideoModelLoader',
      inputs: {
        model: process.env.COMFYUI_WAN_MODEL || 'wan2.2_t2v.safetensors',
      },
    },
    22: {
      class_type: 'WanVideoSampler',
      inputs: {
        model: ['21', 0],
        positive: ['20', 0],
        width,
        height,
        frames: payload.duration ? Math.min(Number(payload.duration) * 8, 120) : 49,
        steps: payload.steps || 25,
        seed: payload.seed || Math.floor(Math.random() * 2147483647),
      },
    },
    23: {
      class_type: 'VHS_VideoCombine',
      inputs: {
        images: ['22', 0],
        frame_rate: 16,
        filename_prefix: 'ogai_wan',
        format: 'video/h264-mp4',
      },
    },
  };
}

/** LTX Video T2V */
export function buildLtxT2vWorkflow(_modelContext, payload) {
  const prompt = String(payload.prompt || '').trim();

  return {
    30: {
      class_type: 'LTXVLoader',
      inputs: {
        ckpt_name: process.env.COMFYUI_LTX_CHECKPOINT || 'ltx-video-2b-v0.9.safetensors',
      },
    },
    31: {
      class_type: 'CLIPTextEncode',
      inputs: { text: prompt, clip: ['30', 1] },
    },
    32: {
      class_type: 'LTXVScheduler',
      inputs: {
        model: ['30', 0],
        positive: ['31', 0],
        num_frames: 97,
        width: 768,
        height: 512,
      },
    },
    33: {
      class_type: 'VHS_VideoCombine',
      inputs: {
        images: ['32', 0],
        frame_rate: 24,
        filename_prefix: 'ogai_ltx',
        format: 'video/h264-mp4',
      },
    },
  };
}

/** MusicGen audio — nodo custom común en ComfyUI-Audio */
export function buildMusicgenWorkflow(_modelContext, payload) {
  const prompt = String(payload.prompt || '').trim();
  const duration = Number(payload.duration) || 30;

  return {
    40: {
      class_type: 'MusicGen',
      inputs: {
        prompt,
        duration: Math.min(duration, 30),
        model: process.env.COMFYUI_MUSICGEN_MODEL || 'facebook/musicgen-medium',
      },
    },
    41: {
      class_type: 'SaveAudio',
      inputs: { audio: ['40', 0], filename_prefix: 'ogai_music' },
    },
  };
}

/** ACE-Step placeholder */
export function buildAceStepWorkflow(_modelContext, payload) {
  const prompt = String(payload.prompt || payload.style || '').trim();

  return {
    50: {
      class_type: 'ACEStepGen',
      inputs: { prompt, duration: 60 },
    },
    51: {
      class_type: 'SaveAudio',
      inputs: { audio: ['50', 0], filename_prefix: 'ogai_ace' },
    },
  };
}

export function buildWorkflowForModel(modelContext, payload, uploadedImageName = null) {
  const wf = modelContext.workflow || modelContext.comfyuiWorkflow;
  switch (wf) {
    case 'sdxl_t2i':
      return buildSdxlT2iWorkflow(modelContext, payload);
    case 'sdxl_i2i':
      if (!uploadedImageName) throw new Error('img2img requiere imagen (image_url).');
      return buildSdxlI2iWorkflow(modelContext, payload, uploadedImageName);
    case 'flux_t2i':
      return buildFluxT2iWorkflow(modelContext, payload);
    case 'wan_t2v':
      return buildWanT2vWorkflow(modelContext, payload);
    case 'ltx_t2v':
      return buildLtxT2vWorkflow(modelContext, payload);
    case 'musicgen_t2a':
      return buildMusicgenWorkflow(modelContext, payload);
    case 'ace_step_t2a':
      return buildAceStepWorkflow(modelContext, payload);
    default:
      throw new Error(`Workflow ComfyUI desconocido: ${wf}`);
  }
}
