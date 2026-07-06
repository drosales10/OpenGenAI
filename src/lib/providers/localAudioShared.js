/**
 * Cliente HTTP compartido para servidor de audio local (MusicGen / ACE-Step).
 */

const DEFAULT_HOST = 'http://127.0.0.1:8765';

export function resolveLocalAudioHostFromEnv() {
  const host =
    process.env.LOCAL_AUDIO_HOST
    || process.env.LOCAL_AUDIO_URL
    || process.env.MUSICGEN_HOST;
  return normalizeLocalAudioHost(host || DEFAULT_HOST);
}

export function normalizeLocalAudioHost(host) {
  const trimmed = String(host || DEFAULT_HOST).trim().replace(/\/$/, '');
  if (!trimmed) return DEFAULT_HOST;
  if (!/^https?:\/\//i.test(trimmed)) return `http://${trimmed}`;
  return trimmed;
}

export async function localAudioFetch(path, { host, method = 'GET', body, timeoutMs = 600000 } = {}) {
  const base = normalizeLocalAudioHost(host);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${base}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function localAudioHealth(host) {
  try {
    const response = await localAudioFetch('/health', { host, timeoutMs: 8000 });
    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      return { ok: true, host: normalizeLocalAudioHost(host), ...data };
    }
    const fallback = await localAudioFetch('/v1/audio/health', { host, timeoutMs: 8000 });
    if (fallback.ok) {
      const data = await fallback.json().catch(() => ({}));
      return { ok: true, host: normalizeLocalAudioHost(host), ...data };
    }
    return { ok: false, host: normalizeLocalAudioHost(host), error: `HTTP ${response.status}` };
  } catch (error) {
    return {
      ok: false,
      host: normalizeLocalAudioHost(host),
      error: error.name === 'AbortError' ? 'Timeout' : error.message,
    };
  }
}
