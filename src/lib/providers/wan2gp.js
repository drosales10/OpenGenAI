/**
 * Adaptador Wan2GP — imagen y video vía servidor Gradio local.
 */

import {
  arToDimensions,
  getFnResolutionCache,
  getWan2gpCatalogEntry,
  gradioCall,
  normalizeWan2gpUrl,
  probeWan2gp,
  resolveWan2gpOutputUrl,
} from '@/src/lib/providers/wan2gpShared';

const uploadedFiles = new Map();

export function isWan2gpModel(modelContext = {}) {
  const id = String(modelContext.id || modelContext.endpoint || '');
  return modelContext.provider === 'wan2gp'
    || id.startsWith('wan2gp-')
    || id.startsWith('wan2gp:');
}

export function resolveWan2gpCatalogModel(modelContext = {}) {
  if (modelContext.wan2gpId) {
    return getWan2gpCatalogEntry(modelContext.wan2gpId);
  }
  return getWan2gpCatalogEntry(modelContext.id || modelContext.endpoint);
}

export function cacheWan2gpUpload(baseUrl, fileUrl, descriptor) {
  uploadedFiles.set(fileUrl, descriptor);
}

export async function uploadFileToWan2gp(baseUrl, { name, type, bytes }) {
  const base = normalizeWan2gpUrl(baseUrl);
  if (!bytes?.length) throw new Error('Archivo vacío');

  const blob = new Blob([bytes], { type: type || 'application/octet-stream' });
  const form = new FormData();
  form.append('files', blob, name || 'upload.bin');

  const uploadId = Math.random().toString(36).slice(2, 12);
  const res = await fetch(`${base}/upload?upload_id=${uploadId}`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Wan2GP upload falló: HTTP ${res.status}`);

  const paths = await res.json();
  const path = Array.isArray(paths) ? paths[0] : paths;
  if (!path || typeof path !== 'string') throw new Error('Wan2GP upload sin path');

  const fileUrl = `${base}/file=${String(path).replace(/^\/+/, '')}`;
  const descriptor = {
    path,
    url: fileUrl,
    orig_name: name || 'upload.bin',
    mime_type: type || 'application/octet-stream',
    meta: { _type: 'gradio.FileData' },
  };
  uploadedFiles.set(fileUrl, descriptor);
  return { url: fileUrl, path };
}

function resolveImageDescriptor(base, imageRef) {
  if (!imageRef) return null;
  const cached = uploadedFiles.get(imageRef);
  if (cached) return cached;
  if (typeof imageRef === 'string') return imageRef;
  return imageRef;
}

export async function generateWan2gp(modelContext, payload, host) {
  const base = normalizeWan2gpUrl(host);
  const catalog = resolveWan2gpCatalogModel(modelContext);
  if (!catalog) {
    throw new Error(`Modelo Wan2GP desconocido: ${modelContext.id}`);
  }

  let cached = getFnResolutionCache(base);
  if (!cached) {
    await probeWan2gp(base);
    cached = getFnResolutionCache(base);
  }

  const realFn = cached?.resolved?.get(catalog.id) || catalog.fn;
  if (cached?.apiNames?.length && !cached.resolved.get(catalog.id)) {
    throw new Error(
      `${catalog.name}: el servidor Wan2GP no expone api_name "${catalog.fn}". `
      + `Carga el modelo en Wan2GP o actualiza la versión.`
    );
  }

  const prompt = String(payload.prompt || '').trim();
  if (!prompt && !catalog.needsImage) {
    throw new Error('El prompt es obligatorio.');
  }

  const [width, height] = arToDimensions(payload.aspect_ratio || '1:1');
  const seed = payload.seed && payload.seed !== -1
    ? payload.seed
    : Math.floor(Math.random() * 2147483647);
  const steps = payload.steps ?? catalog.defaultSteps;
  const guidance = payload.guidance_scale ?? payload.guidance ?? catalog.defaultGuidance;

  const imageRef = payload.image
    || payload.image_url
    || payload.start_image_url
    || payload.reference_image_url;
  const imageDescriptor = resolveImageDescriptor(base, imageRef);

  if (catalog.needsImage && !imageDescriptor) {
    throw new Error(`${catalog.name} requiere una imagen inicial.`);
  }

  const gradioPayload = {
    data: [
      prompt || '',
      payload.negative_prompt || '',
      width,
      height,
      steps,
      guidance,
      seed,
      imageDescriptor,
    ],
  };

  const ac = new AbortController();
  const result = await gradioCall(base, realFn, gradioPayload, ac.signal);
  let mediaUrl = resolveWan2gpOutputUrl(base, result);

  if (mediaUrl && !mediaUrl.startsWith('data:')) {
    mediaUrl = `/api/generate/media?provider=wan2gp&uri=${encodeURIComponent(mediaUrl)}`;
  }

  return {
    status: 'completed',
    url: mediaUrl,
    outputs: mediaUrl ? [mediaUrl] : [],
    mediaType: catalog.type,
    seed,
    wan2gp_fn: realFn,
  };
}

export function wrapWan2gpMediaUrl(mediaUrl) {
  if (!mediaUrl || mediaUrl.startsWith('/api/generate/media')) return mediaUrl;
  if (mediaUrl.startsWith('data:')) return mediaUrl;
  return `/api/generate/media?provider=wan2gp&uri=${encodeURIComponent(mediaUrl)}`;
}
