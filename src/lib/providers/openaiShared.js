/**
 * Utilidades compartidas — OpenAI API directa.
 */

export const OPENAI_API_BASE = 'https://api.openai.com/v1';

export function openaiHeaders(apiKey, contentType = 'application/json') {
  const headers = { Authorization: `Bearer ${String(apiKey || '').trim()}` };
  if (contentType) headers['Content-Type'] = contentType;
  return headers;
}

export function parseOpenAIError(data, status, label = 'OpenAI') {
  const msg =
    data?.error?.message
    || data?.error?.code
    || (typeof data?.error === 'string' ? data.error : null)
    || JSON.stringify(data).slice(0, 400);
  return new Error(`${label} (${status}): ${msg}`);
}

export function resolveOpenAIApiKeyFromEnv() {
  const key = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
  return key?.trim() || null;
}

export async function fetchAsBlob(imageUrl) {
  const url = String(imageUrl || '').trim();
  if (!url) return null;

  if (url.startsWith('data:')) {
    const match = url.match(/^data:([^;,]+)?;base64,(.+)$/);
    if (!match) return null;
    const buffer = Buffer.from(match[2], 'base64');
    return new Blob([buffer], { type: match[1] || 'image/png' });
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo cargar la imagen (${response.status})`);
  }
  const buffer = await response.arrayBuffer();
  const type = response.headers.get('content-type')?.split(';')[0] || 'image/png';
  return new Blob([buffer], { type });
}

export function buildOpenAIVideoProxyUrl(videoId, endpoint) {
  const params = new URLSearchParams({
    provider: 'openai',
    video_id: videoId,
    endpoint,
  });
  return `/api/generate/media?${params.toString()}`;
}
