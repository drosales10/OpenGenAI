import { isStagedMediaUrl, parseStagedMediaId, readStagedMedia } from '@/src/lib/server/mediaStaging';
import { falUploadBytes } from '@/src/lib/providers/falShared';

const MUAPI_BASE = 'https://api.muapi.ai';

const PAYLOAD_MEDIA_FIELDS = [
  'image_url',
  'start_image_url',
  'last_image',
  'end_image_url',
  'video_url',
  'swap_url',
  'model_image_url',
  'person_image_url',
];

function extFromMime(mimeType) {
  const map = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return map[mimeType] || 'bin';
}

export function payloadUsesStagingMedia(payload = {}) {
  const isStaging = (value) => typeof value === 'string' && isStagedMediaUrl(value);
  for (const field of PAYLOAD_MEDIA_FIELDS) {
    if (isStaging(payload[field])) return true;
  }
  if (Array.isArray(payload.images_list) && payload.images_list.some(isStaging)) {
    return true;
  }
  return false;
}

async function uploadBytesToMuapi(buffer, mimeType, apiKey, fileName) {
  const trimmedKey = String(apiKey || '').trim();
  if (!trimmedKey) {
    throw new Error('Clave MuAPI requerida para subir la imagen');
  }

  const form = new FormData();
  const blob = new Blob([buffer], { type: mimeType || 'application/octet-stream' });
  form.append('file', blob, fileName);

  const response = await fetch(`${MUAPI_BASE}/api/v1/upload_file`, {
    method: 'POST',
    headers: { 'x-api-key': trimmedKey },
    body: form,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.detail || data?.error || data?.message || response.statusText;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 200));
  }

  const fileUrl = data.url || data.file_url || data.data?.url;
  if (!fileUrl) {
    throw new Error('MuAPI no devolvió URL del archivo subido');
  }
  return fileUrl;
}

export async function resolveStagedMediaUrl(url, { target, apiKey }) {
  const raw = String(url || '').trim();
  if (!raw || !isStagedMediaUrl(raw)) return raw;

  const staged = await readStagedMedia(parseStagedMediaId(raw));
  const fileName = `upload.${extFromMime(staged.mimeType)}`;

  if (target === 'fal') {
    return falUploadBytes(staged.buffer, staged.mimeType, apiKey, fileName);
  }
  if (target === 'muapi') {
    return uploadBytesToMuapi(staged.buffer, staged.mimeType, apiKey, fileName);
  }

  throw new Error(`Destino de medios no soportado: ${target}`);
}

export async function hydratePayloadStagingMedia(payload, options) {
  if (!payload || !payloadUsesStagingMedia(payload)) {
    return payload;
  }

  const next = { ...payload };

  for (const field of PAYLOAD_MEDIA_FIELDS) {
    if (typeof next[field] === 'string' && isStagedMediaUrl(next[field])) {
      next[field] = await resolveStagedMediaUrl(next[field], options);
    }
  }

  if (Array.isArray(next.images_list)) {
    next.images_list = await Promise.all(
      next.images_list.map((item) => resolveStagedMediaUrl(item, options))
    );
  }

  return next;
}
