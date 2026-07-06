/**
 * Adaptador fal.ai — video Kling, MiniMax, Seedance, Wan, Runway.
 * Enruta vía fal.ai con FAL_KEY.
 */

import { falQueueRun } from '@/src/lib/providers/falShared';

const VIDEO_KINDS = new Set(['t2v', 'i2v', 'v2v', 'recast']);

const FAL_VIDEO_PROVIDERS = new Set(['kling', 'minimax', 'bytedance', 'wan', 'runway']);

const APP_TO_FAL_VIDEO = {
  'kling-v2.1-master-t2v': 'fal-ai/kling-video/v2.1/master/text-to-video',
  'kling-v2.1-master-i2v': 'fal-ai/kling-video/v2.1/master/image-to-video',
  'kling-v2.1-standard-i2v': 'fal-ai/kling-video/v2.1/standard/image-to-video',
  'kling-v2.1-pro-i2v': 'fal-ai/kling-video/v2.1/pro/image-to-video',
  'kling-v2.5-turbo-pro-t2v': 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video',
  'kling-v2.5-turbo-pro-i2v': 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
  'kling-v2.5-turbo-std-i2v': 'fal-ai/kling-video/v2.5-turbo/standard/image-to-video',
  'kling-v2.6-pro-t2v': 'fal-ai/kling-video/v2.6/pro/text-to-video',
  'kling-v2.6-pro-i2v': 'fal-ai/kling-video/v2.6/pro/image-to-video',
  'kling-o1-text-to-video': 'fal-ai/kling-video/o3/pro/text-to-video',
  'kling-o1-image-to-video': 'fal-ai/kling-video/o3/pro/image-to-video',
  'kling-o1-reference-to-video': 'fal-ai/kling-video/o3/pro/reference-to-video',
  'kling-o1-standard-image-to-video': 'fal-ai/kling-video/o3/standard/image-to-video',
  'kling-o1-standard-reference-to-video': 'fal-ai/kling-video/o3/standard/reference-to-video',
  'kling-v3.0-pro-text-to-video': 'fal-ai/kling-video/v3/pro/text-to-video',
  'kling-v3.0-standard-text-to-video': 'fal-ai/kling-video/v3/standard/text-to-video',
  'kling-v3.0-pro-image-to-video': 'fal-ai/kling-video/v3/pro/image-to-video',
  'kling-v3.0-standard-image-to-video': 'fal-ai/kling-video/v3/standard/image-to-video',
  'kling-v3.0-omni-pro-image-to-video': 'fal-ai/kling-video/v3/pro/image-to-video',
  'kling-v3.0-omni-standard-image-to-video': 'fal-ai/kling-video/v3/standard/image-to-video',
  'kling-v2.6-std-motion-control': 'fal-ai/kling-video/v2.6/standard/motion-control',
  'kling-v3.0-std-motion-control': 'fal-ai/kling-video/v3/standard/motion-control',

  'seedance-lite-t2v': 'fal-ai/bytedance/seedance/v1/lite/text-to-video',
  'seedance-lite-i2v': 'fal-ai/bytedance/seedance/v1/lite/image-to-video',
  'seedance-pro-t2v': 'fal-ai/bytedance/seedance/v1/pro/text-to-video',
  'seedance-pro-i2v': 'fal-ai/bytedance/seedance/v1/pro/image-to-video',
  'seedance-pro-t2v-fast': 'fal-ai/bytedance/seedance/v1/pro/fast/text-to-video',
  'seedance-pro-i2v-fast': 'fal-ai/bytedance/seedance/v1/pro/fast/image-to-video',
  'seedance-v1.5-pro-t2v': 'bytedance/seedance/v1.5/pro/text-to-video',
  'seedance-v1.5-pro-t2v-fast': 'bytedance/seedance/v1.5/pro/fast/text-to-video',
  'seedance-v1.5-pro-i2v': 'bytedance/seedance/v1.5/pro/image-to-video',
  'seedance-v1.5-pro-i2v-fast': 'bytedance/seedance/v1.5/pro/fast/image-to-video',
  'seedance-v2.0-t2v': 'bytedance/seedance-2.0/text-to-video',
  'seedance-v2.0-i2v': 'bytedance/seedance-2.0/image-to-video',
  'seedance-v2.0-extend': 'bytedance/seedance-2.0/reference-to-video',
  'seedance-lite-reference-video': 'fal-ai/bytedance/seedance/v1/lite/reference-to-video',

  'minimax-hailuo-02-standard-t2v': 'fal-ai/minimax/hailuo-02/standard/text-to-video',
  'minimax-hailuo-02-pro-t2v': 'fal-ai/minimax/hailuo-02/pro/text-to-video',
  'minimax-hailuo-02-standard-i2v': 'fal-ai/minimax/hailuo-02/standard/image-to-video',
  'minimax-hailuo-02-pro-i2v': 'fal-ai/minimax/hailuo-02/pro/image-to-video',
  'minimax-hailuo-2.3-pro-t2v': 'fal-ai/minimax/hailuo-2.3/pro/text-to-video',
  'minimax-hailuo-2.3-standard-t2v': 'fal-ai/minimax/hailuo-2.3/standard/text-to-video',
  'minimax-hailuo-2.3-pro-i2v': 'fal-ai/minimax/hailuo-2.3/pro/image-to-video',
  'minimax-hailuo-2.3-standard-i2v': 'fal-ai/minimax/hailuo-2.3/standard/image-to-video',
  'minimax-hailuo-2.3-fast': 'fal-ai/minimax/hailuo-2.3/fast/text-to-video',

  'runway-text-to-video': 'fal-ai/runway-gen3/turbo/text-to-video',
  'runway-image-to-video': 'fal-ai/runway-gen3/turbo/image-to-video',
  'runway-act-two-i2v': 'fal-ai/runway-gen3/turbo/image-to-video',
  'runway-act-two-recast': 'fal-ai/runway-gen3/turbo/image-to-video',

  'wan2.1-text-to-video': 'fal-ai/wan/v2.1/1.3b/text-to-video',
  'wan2.1-image-to-video': 'fal-ai/wan/v2.1/1.3b/image-to-video',
  'wan2.1-reference-video': 'wan/v2.6/reference-to-video',
  'wan2.2-text-to-video': 'wan/v2.2-a14b/text-to-video',
  'wan2.2-5b-fast-t2v': 'wan/v2.2-a14b/text-to-video',
  'wan2.2-image-to-video': 'wan/v2.2-a14b/image-to-video',
  'wan2.2-spicy-image-to-video': 'wan/v2.2-a14b/image-to-video',
  'wan2.5-text-to-video': 'fal-ai/wan-25-preview/text-to-video',
  'wan2.5-text-to-video-fast': 'fal-ai/wan-25-preview/text-to-video',
  'wan2.5-image-to-video': 'fal-ai/wan-25-preview/image-to-video',
  'wan2.5-image-to-video-fast': 'fal-ai/wan-25-preview/image-to-video',
  'wan2.6-text-to-video': 'wan/v2.6/text-to-video',
  'wan2.6-image-to-video': 'wan/v2.6/image-to-video',
  'wan2.2-speech-to-video': 'wan/v2.6/reference-to-video',
};

function resolveModeSuffix(modelId) {
  const id = String(modelId || '').toLowerCase();
  if (/reference|extend|v2v/.test(id)) return 'reference-to-video';
  if (/motion-control|motion_control/.test(id)) return 'motion-control';
  if (/-i2v|image-to-video|i2v/.test(id)) return 'image-to-video';
  return 'text-to-video';
}

function resolveKlingTier(id) {
  if (/v3\.0.*standard|v3-0-standard|v3\.0-standard/.test(id)) return 'v3/standard';
  if (/v3\.0|v3-0|v3\.0-omni/.test(id)) return 'v3/pro';
  if (/o1.*standard|o1-standard/.test(id)) return 'o3/standard';
  if (/o1|o3/.test(id)) return 'o3/pro';
  if (/v2\.6.*std|v2\.6-std/.test(id)) return 'v2.6/standard';
  if (/v2\.6/.test(id)) return 'v2.6/pro';
  if (/v2\.5.*std|turbo-std/.test(id)) return 'v2.5-turbo/standard';
  if (/v2\.5|turbo/.test(id)) return 'v2.5-turbo/pro';
  if (/standard/.test(id) && !/text-to-video/.test(id)) return 'v2.1/standard';
  if (/pro/.test(id) && /i2v|image/.test(id)) return 'v2.1/pro';
  if (/master/.test(id)) return 'v2.1/master';
  return 'v2.1/master';
}

function resolveSeedanceEndpoint(id, mode) {
  if (/v2\.0|v2-0/.test(id)) {
    if (/extend/.test(id)) return 'bytedance/seedance-2.0/reference-to-video';
    if (/fast/.test(id)) return `bytedance/seedance-2.0/fast/${mode}`;
    return `bytedance/seedance-2.0/${mode}`;
  }
  if (/v1\.5|v1-5/.test(id)) {
    if (/fast/.test(id)) return `bytedance/seedance/v1.5/pro/fast/${mode}`;
    return `bytedance/seedance/v1.5/pro/${mode}`;
  }
  if (/lite/.test(id)) {
    if (/reference/.test(id)) return 'fal-ai/bytedance/seedance/v1/lite/reference-to-video';
    return `fal-ai/bytedance/seedance/v1/lite/${mode}`;
  }
  if (/fast/.test(id)) return `fal-ai/bytedance/seedance/v1/pro/fast/${mode}`;
  return `fal-ai/bytedance/seedance/v1/pro/${mode}`;
}

function resolveMinimaxEndpoint(id, mode) {
  if (/2\.3.*fast|hailuo-2\.3-fast/.test(id)) {
    return `fal-ai/minimax/hailuo-2.3/fast/${mode}`;
  }
  if (/2\.3|hailuo-2\.3/.test(id)) {
    const tier = /pro/.test(id) ? 'pro' : 'standard';
    return `fal-ai/minimax/hailuo-2.3/${tier}/${mode}`;
  }
  if (/02|hailuo-02/.test(id)) {
    const tier = /pro/.test(id) ? 'pro' : 'standard';
    return `fal-ai/minimax/hailuo-02/${tier}/${mode}`;
  }
  return `fal-ai/minimax/hailuo-2.3/pro/${mode}`;
}

function resolveWanEndpoint(id, mode) {
  if (/2\.6|v2\.6/.test(id)) {
    if (/speech-to-video|reference/.test(id)) return 'wan/v2.6/reference-to-video';
    return `wan/v2.6/${mode}`;
  }
  if (/2\.5|v2\.5/.test(id)) {
    return `fal-ai/wan-25-preview/${mode}`;
  }
  if (/2\.2|v2\.2/.test(id)) {
    return `wan/v2.2-a14b/${mode}`;
  }
  if (/2\.1|v2\.1/.test(id)) {
    return `fal-ai/wan/v2.1/1.3b/${mode}`;
  }
  return `wan/v2.6/${mode}`;
}

function resolveRunwayEndpoint(id, mode) {
  if (/act-two|act_two/.test(id)) {
    return 'fal-ai/runway-gen3/turbo/image-to-video';
  }
  return `fal-ai/runway-gen3/turbo/${mode}`;
}

function resolveFalVideoEndpointHeuristic(modelContext) {
  const id = String(modelContext?.id || modelContext?.endpoint || '').toLowerCase();
  const mode = resolveModeSuffix(id);

  if (/^kling|kling-/.test(id)) {
    const tier = resolveKlingTier(id);
    if (mode === 'motion-control') {
      return `fal-ai/kling-video/${tier}/motion-control`;
    }
    return `fal-ai/kling-video/${tier}/${mode}`;
  }

  if (/seedance|seedream|bytedance/.test(id)) {
    return resolveSeedanceEndpoint(id, mode);
  }

  if (/minimax|hailuo/.test(id)) {
    return resolveMinimaxEndpoint(id, mode);
  }

  if (/^wan|wan2|wan-/.test(id)) {
    return resolveWanEndpoint(id, mode);
  }

  if (/runway/.test(id)) {
    return resolveRunwayEndpoint(id, mode);
  }

  return null;
}

export function resolveFalVideoEndpoint(modelContext) {
  const id = modelContext?.id;
  const endpoint = modelContext?.endpoint;

  if (id && APP_TO_FAL_VIDEO[id]) return APP_TO_FAL_VIDEO[id];
  if (endpoint && APP_TO_FAL_VIDEO[endpoint]) return APP_TO_FAL_VIDEO[endpoint];

  return resolveFalVideoEndpointHeuristic(modelContext);
}

export function isFalVideoModel(modelContext) {
  if (!modelContext) return false;
  if (!VIDEO_KINDS.has(modelContext.kind)) return false;
  if (!FAL_VIDEO_PROVIDERS.has(modelContext.provider)) return false;
  return Boolean(resolveFalVideoEndpoint(modelContext));
}

function normalizeDuration(value, fallback = '5') {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (Number.isFinite(parsed) && parsed > 0) return String(parsed);
  return fallback;
}

function buildFalVideoInput(modelContext, payload, falEndpoint) {
  const input = {};
  const prompt = String(payload.prompt || '').trim();
  if (prompt) input.prompt = prompt;

  if (/runway/.test(falEndpoint)) {
    if (payload.aspect_ratio) input.ratio = String(payload.aspect_ratio);
  } else if (payload.aspect_ratio) {
    input.aspect_ratio = String(payload.aspect_ratio);
  }
  if (payload.resolution) input.resolution = String(payload.resolution);
  if (payload.duration != null) {
    const duration = normalizeDuration(payload.duration);
    input.duration = /runway/.test(falEndpoint) ? Number(duration) : duration;
  }
  if (payload.seed != null && payload.seed !== '') input.seed = Number(payload.seed);
  if (payload.camera_fixed != null) input.camera_fixed = Boolean(payload.camera_fixed);
  if (payload.generate_audio != null) input.generate_audio = Boolean(payload.generate_audio);

  if (payload.quality) {
    input.bitrate_mode = String(payload.quality).toLowerCase() === 'high' ? 'high' : 'standard';
  }

  const imageUrl = payload.image_url || payload.images_list?.[0];
  const lastImage = payload.last_image || payload.end_image_url;

  if (imageUrl) {
    if (/seedance-2\.0|seedance\/v2/.test(falEndpoint)) {
      input.image_url = imageUrl;
      if (lastImage) input.end_image_url = lastImage;
    } else if (/reference-to-video/.test(falEndpoint)) {
      if (payload.video_url) input.video_urls = [payload.video_url];
      else if (payload.request_id) input.video_urls = [payload.request_id];
      if (imageUrl) input.image_urls = [imageUrl];
    } else if (/image-to-video|motion-control/.test(falEndpoint)) {
      input.image_url = imageUrl;
      if (lastImage) input.tail_image_url = lastImage;
    }
  }

  if (/reference-to-video/.test(falEndpoint) && payload.images_list?.length) {
    input.image_urls = payload.images_list;
  }
  if (/reference-to-video/.test(falEndpoint) && payload.video_urls) {
    input.video_urls = payload.video_urls;
  }

  if (modelContext.id === 'seedance-v2.0-extend' && payload.request_id && !input.video_urls) {
    input.video_urls = [String(payload.request_id)];
  }

  return input;
}

export async function generateFalVideo(modelContext, payload, apiKey) {
  const falEndpoint = resolveFalVideoEndpoint(modelContext);
  if (!falEndpoint) {
    throw new Error(`Modelo de video no mapeado a fal.ai: ${modelContext.id}`);
  }

  const input = buildFalVideoInput(modelContext, payload, falEndpoint);
  if (!input.prompt && !input.image_url && !input.image_urls?.length && !input.video_urls?.length) {
    throw new Error('Se requiere un prompt o imagen para generar el video');
  }

  const result = await falQueueRun(falEndpoint, input, apiKey, {
    maxAttempts: 360,
    interval: 2000,
  });

  return {
    ...result,
    provider: modelContext.provider,
    model: modelContext.id,
    fal_endpoint: falEndpoint,
    fal_routing: true,
  };
}
