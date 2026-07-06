'use client';

import { useCallback, useEffect, useState } from 'react';
import { getInternalApiBase, getInternalApiKey } from '@/src/lib/internalApi';

export default function ComfyUISettings({ internalApiBase = '', internalApiKey = '' }) {
  const [url, setUrl] = useState('http://127.0.0.1:8188');
  const [health, setHealth] = useState(null);
  const [models, setModels] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const base = (internalApiBase || getInternalApiBase() || '').replace(/\/$/, '');
  const key = internalApiKey || getInternalApiKey() || '';

  const requestApi = useCallback(async (path, options = {}) => {
    const response = await fetch(`${base}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(key ? { 'x-internal-api-key': key } : {}),
        ...(options.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  }, [base, key]);

  const probe = useCallback(async () => {
    const healthRes = await fetch('/api/comfyui/health').then((r) => r.json());
    setHealth(healthRes);
    if (healthRes.ok) {
      const modelsRes = await fetch('/api/comfyui/models').then((r) => r.json());
      if (modelsRes.ok) setModels(modelsRes.models);
    } else {
      setModels(null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        if (key) {
          try {
            const creds = await requestApi('/api/providers/credentials?module_id=_global');
            const row = creds.providers?.find((p) => p.provider_id === 'comfyui');
            if (row?.credentials_preview?.base_url) {
              setUrl(row.credentials_preview.base_url);
            }
          } catch { /* ignore */ }
        }
        await probe();
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!key) { setMsg('Configura la clave interna para guardar.'); return; }
    setSaving(true);
    setMsg('');
    try {
      await requestApi('/api/providers/credentials', {
        method: 'POST',
        body: JSON.stringify({
          module_id: '_global',
          provider_id: 'comfyui',
          credentials: { base_url: url.trim() },
        }),
      });
      setMsg('URL ComfyUI guardada.');
      await probe();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-xs text-white/45 py-4">Cargando ComfyUI…</div>;

  const modelCount = models
    ? (models.t2i?.length || 0) + (models.t2v?.length || 0) + (models.audio?.length || 0)
    : 0;

  return (
    <div className="space-y-3 border border-teal-500/20 rounded-lg bg-teal-500/[0.03] p-4">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <span className="text-teal-400">●</span> ComfyUI — imagen, video y audio local
      </h3>
      <p className="text-[11px] text-white/45 leading-relaxed">
        Instala{' '}
        <a href="https://github.com/comfyanonymous/ComfyUI" className="text-teal-300 underline" target="_blank" rel="noreferrer">
          ComfyUI
        </a>
        , inicia el servidor API y elige modelos <strong className="text-white/70">(ComfyUI)</strong> en Image, Video o Audio Studio.
        Algunos workflows requieren nodos custom (Flux, Wan, LTX, MusicGen).
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 h-9 rounded-md bg-black/30 border border-white/10 px-3 text-xs text-white/90 outline-none focus:border-teal-400/40"
          placeholder="http://127.0.0.1:8188"
        />
        <button type="button" onClick={() => void probe()} className="h-9 px-3 rounded-md bg-white/10 text-xs font-bold text-white/80">Probar</button>
        <button type="button" onClick={() => void handleSave()} disabled={saving} className="h-9 px-3 rounded-md bg-teal-500 text-black text-xs font-bold disabled:opacity-40">{saving ? '…' : 'Guardar'}</button>
      </div>
      {health && (
        <div className={`text-xs rounded-md px-3 py-2 border ${health.ok ? 'bg-teal-500/10 border-teal-500/30 text-teal-200' : 'bg-red-500/10 border-red-500/30 text-red-200'}`}>
          {health.ok
            ? `ComfyUI OK — ${modelCount} modelos en catálogo${health.stats?.system?.comfyui_version ? ` (v${health.stats.system.comfyui_version})` : ''}`
            : `Error: ${health.error || 'Sin conexión'}`}
        </div>
      )}
      {msg && <div className="text-[11px] text-white/50">{msg}</div>}
    </div>
  );
}
