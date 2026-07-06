/**
 * Catálogo Wan2GP compartido (Electron + web).
 * @see https://github.com/deepbeepmeep/Wan2GP
 */

export const WAN2GP_CATALOG = [
  {
    id: 'wan2gp:flux-dev',
    name: 'Flux.1 Dev (Wan2GP)',
    description: 'Imagen — FLUX.1 dev servido por Wan2GP.',
    type: 'image',
    kind: 't2i',
    family: 'flux',
    provider: 'wan2gp',
    fn: 'flux',
    fnAliases: ['flux_dev', 'flux_1_dev', 'flux1_dev', 'flux_image'],
    aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16'],
    defaultSteps: 28,
    defaultGuidance: 3.5,
    endpoint: 'wan2gp-flux-dev',
  },
  {
    id: 'wan2gp:qwen-image',
    name: 'Qwen Image (Wan2GP)',
    description: 'Imagen — Qwen-Image text-to-image vía Wan2GP.',
    type: 'image',
    kind: 't2i',
    family: 'qwen',
    provider: 'wan2gp',
    fn: 'qwen_image',
    fnAliases: ['qwen', 'qwen_t2i', 'qwen_image_t2i'],
    aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16'],
    defaultSteps: 30,
    defaultGuidance: 4.0,
    endpoint: 'wan2gp-qwen-image',
  },
  {
    id: 'wan2gp:wan22-t2v',
    name: 'Wan 2.2 T2V (Wan2GP)',
    description: 'Video — Wan 2.2 text-to-video local.',
    type: 'video',
    kind: 't2v',
    family: 'wan',
    provider: 'wan2gp',
    fn: 'wan22_t2v',
    fnAliases: ['wan_2_2_t2v', 'wan22_text2video', 'wan_t2v', 'wan2_2_t2v', 't2v'],
    aspectRatios: ['16:9', '1:1', '9:16'],
    defaultSteps: 25,
    defaultGuidance: 5.0,
    endpoint: 'wan2gp-wan22-t2v',
  },
  {
    id: 'wan2gp:wan22-i2v',
    name: 'Wan 2.2 I2V (Wan2GP)',
    description: 'Video — Wan 2.2 image-to-video. Requiere imagen inicial.',
    type: 'video',
    kind: 'i2v',
    family: 'wan',
    provider: 'wan2gp',
    fn: 'wan22_i2v',
    fnAliases: ['wan_2_2_i2v', 'wan22_image2video', 'wan_i2v', 'wan2_2_i2v', 'i2v'],
    needsImage: true,
    aspectRatios: ['16:9', '1:1', '9:16'],
    defaultSteps: 25,
    defaultGuidance: 5.0,
    endpoint: 'wan2gp-wan22-i2v',
  },
  {
    id: 'wan2gp:hunyuan-video',
    name: 'Hunyuan Video (Wan2GP)',
    description: 'Video — Hunyuan text-to-video vía Wan2GP.',
    type: 'video',
    kind: 't2v',
    family: 'hunyuan',
    provider: 'wan2gp',
    fn: 'hunyuan_video',
    fnAliases: ['hunyuan', 'hunyuan_t2v', 'hyvideo', 'hy_video'],
    aspectRatios: ['16:9', '1:1', '9:16'],
    defaultSteps: 30,
    defaultGuidance: 6.0,
    endpoint: 'wan2gp-hunyuan-video',
  },
  {
    id: 'wan2gp:ltx-video',
    name: 'LTX Video (Wan2GP)',
    description: 'Video — LTX text-to-video. Opción más rápida en GPU consumer.',
    type: 'video',
    kind: 't2v',
    family: 'ltx',
    provider: 'wan2gp',
    fn: 'ltx_video',
    fnAliases: ['ltx', 'ltx_t2v', 'ltxv', 'ltx_v', 'ltx_2', 'ltx2'],
    aspectRatios: ['16:9', '1:1', '9:16'],
    defaultSteps: 20,
    defaultGuidance: 3.0,
    endpoint: 'wan2gp-ltx-video',
  },
];

export function getWan2gpCatalogEntry(idOrEndpoint) {
  const key = String(idOrEndpoint || '');
  return WAN2GP_CATALOG.find(
    (m) => m.id === key || m.endpoint === key
  ) || null;
}

export function catalogEntryToStudioModel(entry) {
  return {
    id: entry.endpoint,
    name: entry.name,
    endpoint: entry.endpoint,
    provider: 'wan2gp',
    family: entry.family,
    wan2gpId: entry.id,
    description: entry.description,
    inputs: {
      prompt: {
        type: 'string',
        title: 'Prompt',
        name: 'prompt',
        description: 'Descripción del contenido a generar.',
      },
      aspect_ratio: {
        type: 'string',
        title: 'Aspect Ratio',
        name: 'aspect_ratio',
        enum: entry.aspectRatios || ['16:9', '1:1', '9:16'],
        default: (entry.aspectRatios || ['16:9'])[0],
      },
    },
  };
}

export const wan2gpT2iModels = WAN2GP_CATALOG
  .filter((m) => m.kind === 't2i')
  .map(catalogEntryToStudioModel);

export const wan2gpT2vModels = WAN2GP_CATALOG
  .filter((m) => m.kind === 't2v' && !m.needsImage)
  .map(catalogEntryToStudioModel);

export const wan2gpI2vModels = WAN2GP_CATALOG
  .filter((m) => m.kind === 'i2v' || m.needsImage)
  .map(catalogEntryToStudioModel);

export function isWan2gpEndpoint(endpointOrId) {
  return Boolean(getWan2gpCatalogEntry(endpointOrId))
    || String(endpointOrId || '').startsWith('wan2gp-')
    || String(endpointOrId || '').startsWith('wan2gp:');
}
