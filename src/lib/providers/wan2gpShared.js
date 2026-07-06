/**
 * Cliente Wan2GP (Gradio) — compartido web + servidor.
 */

import {
  WAN2GP_CATALOG,
  getWan2gpCatalogEntry,
} from '@/src/lib/wan2gpCatalog';

const DEFAULT_HOST = 'http://127.0.0.1:7860';

const fnResolutionCache = new Map();

export function resolveWan2gpHostFromEnv() {
  const host =
    process.env.WAN2GP_URL
    || process.env.WAN2GP_HOST
    || process.env.WAN2GP_BASE_URL;
  return normalizeWan2gpUrl(host || DEFAULT_HOST);
}

export function normalizeWan2gpUrl(url) {
  const trimmed = String(url || DEFAULT_HOST).trim().replace(/\/+$/, '');
  if (!trimmed) return DEFAULT_HOST;
  if (!/^https?:\/\//i.test(trimmed)) return `http://${trimmed}`;
  return trimmed;
}

async function fetchJson(url, { method = 'GET', body, timeoutMs = 8000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await response.text();
    return { status: response.status, body: text };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchWan2gpApiNames(base) {
  const candidates = [`${base}/info`, `${base}/api`, `${base}/gradio_api/info`];
  for (const candidate of candidates) {
    try {
      const res = await fetchJson(candidate, { timeoutMs: 8000 });
      if (res.status !== 200) continue;
      const parsed = JSON.parse(res.body);
      const named = parsed.named_endpoints || parsed.unnamed_endpoints || parsed;
      if (named && typeof named === 'object') {
        const keys = Object.keys(named).filter((k) => k.startsWith('/'));
        if (keys.length) return keys.map((k) => k.replace(/^\/+/, ''));
      }
    } catch { /* next */ }
  }
  try {
    const res = await fetchJson(`${base}/config`, { timeoutMs: 5000 });
    if (res.status === 200) {
      const cfg = JSON.parse(res.body);
      const deps = Array.isArray(cfg.dependencies) ? cfg.dependencies : [];
      return deps
        .map((d) => d.api_name)
        .filter((n) => typeof n === 'string' && n && n !== 'false');
    }
  } catch { /* ignore */ }
  return [];
}

export function resolveWan2gpFnNames(apiNames) {
  const set = new Set(apiNames);
  const resolved = new Map();
  for (const m of WAN2GP_CATALOG) {
    let hit = null;
    if (set.has(m.fn)) hit = m.fn;
    if (!hit && Array.isArray(m.fnAliases)) {
      for (const a of m.fnAliases) {
        if (set.has(a)) { hit = a; break; }
      }
    }
    if (!hit && m.family) {
      const typeHint = m.type === 'video' ? /(video|t2v|i2v|v2v)/i : /(image|t2i|txt2img)/i;
      const fuzzy = apiNames.find((n) => n.toLowerCase().includes(m.family) && typeHint.test(n))
        || apiNames.find((n) => n.toLowerCase().includes(m.family));
      if (fuzzy) hit = fuzzy;
    }
    resolved.set(m.id, hit);
  }
  return { resolved, apiNames };
}

export function withWan2gpAvailability(model, probeResult, cachedResolution) {
  if (!probeResult?.ok) {
    return {
      ...model,
      ready: false,
      unavailableReason: probeResult?.error || 'Wan2GP probe failed',
    };
  }
  const apiNames = Array.isArray(cachedResolution?.apiNames) ? cachedResolution.apiNames : [];
  const realFn = cachedResolution?.resolved?.get?.(model.id) || null;
  if (realFn) return { ...model, ready: true, fn: realFn };
  if (apiNames.length === 0) {
    return {
      ...model,
      ready: true,
      fn: model.fn,
      availabilityNote: 'Sin metadatos de endpoints; usando api_name por defecto.',
    };
  }
  return {
    ...model,
    ready: false,
    unavailableReason: `Sin api_name para "${model.fn}" en el servidor Wan2GP.`,
  };
}

export async function probeWan2gp(url) {
  const base = normalizeWan2gpUrl(url);
  if (!base) return { ok: false, error: 'URL vacía' };
  try {
    const res = await fetchJson(`${base}/config`, { timeoutMs: 5000 });
    if (res.status !== 200) {
      return { ok: false, error: `HTTP ${res.status} en /config — ¿es un servidor Gradio?` };
    }
    const cfg = JSON.parse(res.body);
    const apiNames = await fetchWan2gpApiNames(base);
    const { resolved } = resolveWan2gpFnNames(apiNames);
    fnResolutionCache.set(base, { apiNames, resolved });
    const matched = [...resolved.values()].filter(Boolean).length;
    return {
      ok: true,
      host: base,
      version: cfg.version || 'unknown',
      apiNames,
      matchedModels: matched,
      totalModels: WAN2GP_CATALOG.length,
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function listWan2gpModels(host) {
  const base = normalizeWan2gpUrl(host);
  const probeRes = await probeWan2gp(base);
  const cached = fnResolutionCache.get(base);
  return WAN2GP_CATALOG.map((m) => withWan2gpAvailability(m, probeRes, cached));
}

export async function gradioCall(base, fn, payload, signal) {
  const post = await fetch(`${base}/gradio_api/call/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  if (!post.ok) throw new Error(`Wan2GP POST /call/${fn} → HTTP ${post.status}`);
  const { event_id } = await post.json();
  if (!event_id) throw new Error('Wan2GP no devolvió event_id');

  const stream = await fetch(`${base}/gradio_api/call/${fn}/${event_id}`, { signal });
  if (!stream.ok) throw new Error(`Wan2GP stream → HTTP ${stream.status}`);

  const reader = stream.body.getReader();
  const dec = new TextDecoder();
  let buf = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const blocks = buf.split('\n\n');
    buf = blocks.pop();
    for (const block of blocks) {
      const eMatch = block.match(/event:\s*(\S+)/);
      const dMatch = block.match(/data:\s*(.*)$/s);
      if (!eMatch) continue;
      const evt = eMatch[1];
      const dataStr = dMatch ? dMatch[1].trim() : '';
      if (evt === 'complete' || evt === 'process_completes') {
        try {
          const parsed = JSON.parse(dataStr);
          return Array.isArray(parsed) ? parsed : (parsed.data || parsed);
        } catch {
          throw new Error(`Wan2GP respuesta malformada: ${dataStr.slice(0, 200)}`);
        }
      }
      if (evt === 'error' || evt === 'process_error') {
        throw new Error(`Wan2GP error: ${dataStr.slice(0, 200)}`);
      }
    }
  }
  throw new Error('Wan2GP stream terminó sin evento complete');
}

export function resolveWan2gpOutputUrl(base, output) {
  const first = Array.isArray(output) ? output[0] : output;
  if (!first) return null;
  if (typeof first === 'string') {
    return first.startsWith('http') ? first : `${base}/file=${first.replace(/^\/+/, '')}`;
  }
  if (first.url) return first.url.startsWith('http') ? first.url : `${base}${first.url}`;
  if (first.path) return `${base}/file=${first.path.replace(/^\/+/, '')}`;
  return null;
}

export function arToDimensions(ar) {
  const base = 1024;
  const map = {
    '1:1': [base, base],
    '16:9': [Math.round((base * 16) / 9 / 64) * 64, base],
    '9:16': [base, Math.round((base * 16) / 9 / 64) * 64],
    '4:3': [Math.round((base * 4) / 3 / 64) * 64, base],
    '3:4': [base, Math.round((base * 4) / 3 / 64) * 64],
  };
  return map[ar] || [base, base];
}

export function getFnResolutionCache(base) {
  return fnResolutionCache.get(normalizeWan2gpUrl(base));
}

export { WAN2GP_CATALOG, getWan2gpCatalogEntry };
