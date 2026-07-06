/**
 * Cliente HTTP compartido para Ollama.
 * @see https://github.com/ollama/ollama/blob/main/docs/api.md
 */

const DEFAULT_HOST = 'http://127.0.0.1:11434';

export function resolveOllamaHostFromEnv() {
  const host =
    process.env.OLLAMA_HOST
    || process.env.OLLAMA_BASE_URL
    || process.env.OLLAMA_URL;
  return normalizeOllamaHost(host || DEFAULT_HOST);
}

export function normalizeOllamaHost(host) {
  const trimmed = String(host || DEFAULT_HOST).trim().replace(/\/$/, '');
  if (!trimmed) return DEFAULT_HOST;
  if (!/^https?:\/\//i.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return trimmed;
}

export async function ollamaFetch(path, { host, method = 'GET', body, timeoutMs = 300000 } = {}) {
  const base = normalizeOllamaHost(host);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export async function ollamaHealth(host) {
  try {
    const response = await ollamaFetch('/api/tags', { host, timeoutMs: 8000 });
    if (!response.ok) {
      return { ok: false, host: normalizeOllamaHost(host), error: `HTTP ${response.status}` };
    }
    const data = await response.json();
    const models = (data.models || []).map((m) => ({
      name: m.name,
      size: m.size,
      modified_at: m.modified_at,
    }));
    return { ok: true, host: normalizeOllamaHost(host), models };
  } catch (error) {
    return {
      ok: false,
      host: normalizeOllamaHost(host),
      error: error.name === 'AbortError' ? 'Timeout' : error.message,
    };
  }
}

export async function listOllamaModels(host) {
  const health = await ollamaHealth(host);
  if (!health.ok) throw new Error(health.error || 'Ollama no responde');
  return health.models;
}
