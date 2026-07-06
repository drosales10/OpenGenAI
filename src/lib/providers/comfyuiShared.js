/**
 * Cliente HTTP ComfyUI — /prompt, /history, /upload, /view
 */

const DEFAULT_HOST = 'http://127.0.0.1:8188';

export function resolveComfyuiHostFromEnv() {
  const host =
    process.env.COMFYUI_URL
    || process.env.COMFYUI_HOST
    || process.env.COMFYUI_BASE_URL;
  return normalizeComfyuiHost(host || DEFAULT_HOST);
}

export function normalizeComfyuiHost(host) {
  const trimmed = String(host || DEFAULT_HOST).trim().replace(/\/+$/, '');
  if (!trimmed) return DEFAULT_HOST;
  if (!/^https?:\/\//i.test(trimmed)) return `http://${trimmed}`;
  return trimmed;
}

export async function comfyuiFetch(path, { host, method = 'GET', body, timeoutMs = 600000 } = {}) {
  const base = normalizeComfyuiHost(host);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${base}${path}`, {
      method,
      headers: body instanceof FormData ? undefined : (body ? { 'Content-Type': 'application/json' } : undefined),
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function comfyuiHealth(host) {
  try {
    const base = normalizeComfyuiHost(host);
    const res = await comfyuiFetch('/system_stats', { host: base, timeoutMs: 8000 });
    if (res.ok) {
      const stats = await res.json().catch(() => ({}));
      const infoRes = await comfyuiFetch('/object_info', { host: base, timeoutMs: 15000 });
      const nodeCount = infoRes.ok
        ? Object.keys(await infoRes.json().catch(() => ({}))).length
        : 0;
      return { ok: true, host: base, nodeCount, stats };
    }
    const fallback = await comfyuiFetch('/object_info', { host: base, timeoutMs: 8000 });
    if (fallback.ok) {
      const nodes = await fallback.json();
      return { ok: true, host: base, nodeCount: Object.keys(nodes).length };
    }
    return { ok: false, host: base, error: `HTTP ${res.status}` };
  } catch (e) {
    return {
      ok: false,
      host: normalizeComfyuiHost(host),
      error: e.name === 'AbortError' ? 'Timeout' : e.message,
    };
  }
}

export async function listComfyuiNodeTypes(host) {
  const res = await comfyuiFetch('/object_info', { host, timeoutMs: 15000 });
  if (!res.ok) throw new Error(`ComfyUI object_info: HTTP ${res.status}`);
  return Object.keys(await res.json());
}

export function hasComfyuiNodes(nodeTypes, required) {
  const missing = required.filter((n) => !nodeTypes.includes(n));
  return { ok: missing.length === 0, missing };
}

export async function uploadComfyuiImage(host, bytes, filename = 'input.png') {
  const base = normalizeComfyuiHost(host);
  const blob = new Blob([bytes], { type: 'application/octet-stream' });
  const form = new FormData();
  form.append('image', blob, filename);
  form.append('overwrite', 'true');

  const res = await comfyuiFetch('/upload/image', { host: base, method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ComfyUI upload falló: ${err.slice(0, 120)}`);
  }
  const data = await res.json();
  return data.name || data.filename || filename;
}

export async function submitComfyuiPrompt(host, workflow, clientId) {
  const res = await comfyuiFetch('/prompt', {
    host,
    method: 'POST',
    body: { prompt: workflow, client_id: clientId || `ogai-${Date.now()}` },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ComfyUI /prompt (${res.status}): ${err.slice(0, 300)}`);
  }
  const data = await res.json();
  const promptId = data.prompt_id;
  if (!promptId) throw new Error('ComfyUI no devolvió prompt_id');
  if (data.node_errors && Object.keys(data.node_errors).length) {
    throw new Error(`Errores en nodos: ${JSON.stringify(data.node_errors).slice(0, 200)}`);
  }
  return promptId;
}

export async function pollComfyuiHistory(host, promptId, maxAttempts = 300, intervalMs = 2000) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const res = await comfyuiFetch(`/history/${promptId}`, { host, timeoutMs: 10000 });
    if (!res.ok) continue;
    const history = await res.json();
    const entry = history[promptId];
    if (!entry) continue;
    if (entry.status?.status_str === 'error') {
      throw new Error(entry.status?.messages?.[0]?.[1] || 'ComfyUI workflow error');
    }
    if (entry.outputs && Object.keys(entry.outputs).length) {
      return entry;
    }
  }
  throw new Error('ComfyUI: timeout esperando historial');
}

export function buildComfyuiViewUrl(host, fileRef) {
  const base = normalizeComfyuiHost(host);
  const params = new URLSearchParams({
    filename: fileRef.filename,
    type: fileRef.type || 'output',
  });
  if (fileRef.subfolder) params.set('subfolder', fileRef.subfolder);
  return `${base}/view?${params.toString()}`;
}

export function extractComfyuiOutputs(historyEntry, host) {
  const outputs = historyEntry.outputs || {};
  const media = [];

  for (const nodeId of Object.keys(outputs)) {
    const node = outputs[nodeId];
    if (node.images) {
      for (const img of node.images) {
        media.push({
          kind: 'image',
          url: buildComfyuiViewUrl(host, img),
          ref: img,
        });
      }
    }
    if (node.gifs) {
      for (const gif of node.gifs) {
        media.push({
          kind: 'video',
          url: buildComfyuiViewUrl(host, { ...gif, type: gif.type || 'output' }),
          ref: gif,
        });
      }
    }
    if (node.audio) {
      for (const aud of node.audio) {
        media.push({
          kind: 'audio',
          url: buildComfyuiViewUrl(host, { ...aud, type: aud.type || 'output' }),
          ref: aud,
        });
      }
    }
  }

  return media;
}

export function wrapComfyuiMediaUrl(mediaUrl) {
  if (!mediaUrl || mediaUrl.startsWith('data:') || mediaUrl.startsWith('/api/generate/media')) {
    return mediaUrl;
  }
  return `/api/generate/media?provider=comfyui&uri=${encodeURIComponent(mediaUrl)}`;
}
