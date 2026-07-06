import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const STAGING_DIR = path.join(os.tmpdir(), 'ogai-media-staging');
const TTL_MS = 30 * 60 * 1000;
const STAGING_PREFIX = 'staging://';

export function isStagedMediaUrl(url) {
  return String(url || '').startsWith(STAGING_PREFIX);
}

export function parseStagedMediaId(url) {
  return String(url || '').slice(STAGING_PREFIX.length).trim();
}

function extFromMime(mimeType) {
  const map = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return map[mimeType] || 'bin';
}

export async function stageMediaFile(buffer, mimeType = 'application/octet-stream') {
  await fs.mkdir(STAGING_DIR, { recursive: true });
  const id = crypto.randomBytes(16).toString('hex');
  const ext = extFromMime(mimeType);
  const filePath = path.join(STAGING_DIR, `${id}.${ext}`);
  await fs.writeFile(filePath, buffer);
  return { id, filePath, mimeType, url: `${STAGING_PREFIX}${id}` };
}

export async function readStagedMedia(stagingId) {
  const id = String(stagingId || '').trim();
  if (!id) throw new Error('Referencia de archivo temporal inválida');

  let files;
  try {
    files = await fs.readdir(STAGING_DIR);
  } catch {
    throw new Error('Archivo temporal no encontrado');
  }

  const match = files.find((name) => name.startsWith(`${id}.`));
  if (!match) throw new Error('Archivo temporal no encontrado o expirado');

  const filePath = path.join(STAGING_DIR, match);
  const stat = await fs.stat(filePath);
  if (Date.now() - stat.mtimeMs > TTL_MS) {
    await fs.unlink(filePath).catch(() => {});
    throw new Error('Archivo temporal expirado; vuelve a subir la imagen');
  }

  const buffer = await fs.readFile(filePath);
  const ext = match.split('.').pop();
  const mimeByExt = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
  };

  return {
    buffer,
    mimeType: mimeByExt[ext] || 'application/octet-stream',
    filePath,
  };
}
