import { readStagedMedia, isStagedMediaUrl, parseStagedMediaId } from '@/src/lib/server/mediaStaging';

export async function fetchMediaBytes(url) {
  const raw = String(url || '').trim();
  if (!raw) return null;

  if (raw.startsWith('data:')) {
    const match = raw.match(/^data:([^;,]+)?;base64,(.+)$/s);
    if (!match) throw new Error('Data URL de imagen inválida');
    return {
      mimeType: match[1] || 'image/png',
      buffer: Buffer.from(match[2], 'base64'),
    };
  }

  if (isStagedMediaUrl(raw)) {
    const staged = await readStagedMedia(parseStagedMediaId(raw));
    return { mimeType: staged.mimeType, buffer: staged.buffer };
  }

  const response = await fetch(raw, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`No se pudo cargar la imagen de referencia (${response.status})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeType = response.headers.get('content-type')?.split(';')[0] || 'image/png';
  return { mimeType, buffer };
}

export async function fetchMediaAsInlineData(url) {
  const media = await fetchMediaBytes(url);
  if (!media) return null;
  return {
    inlineData: {
      mimeType: media.mimeType,
      data: media.buffer.toString('base64'),
    },
  };
}
