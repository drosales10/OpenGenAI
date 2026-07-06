'use client';

import { useCallback, useEffect, useState } from 'react';
import { getInternalApiBase, getInternalApiKey } from '@/src/lib/internalApi';

export default function Wan2gpSettings({ internalApiBase = '', internalApiKey = '' }) {
  const [url, setUrl] = useState('http://127.0.0.1:7860');
  const [health, setHealth] = useState(null);
  const [models, setModels] = useState([]);
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

  const probe = useCallback(async (hostOverride) => {
    const h = encodeURIComponent(hostOverride || url);
    const healthRes = await fetch(`/api/wan2gp/health?host=${h}`).then((r) => r.json());
    setHealth(healthRes);
    if (healthRes.ok) {
      const modelsRes = await fetch(`/api/wan2gp/models?host=${h}`).then((r) => r.json());
      if (modelsRes.ok) setModels(modelsRes.models || []);
    } else {
      setModels([]);
    }
  }, [url]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        let hostToProbe = url;
        if (key) {
          try {
            const creds = await requestApi('/api/providers/credentials?module_id=_global');
            const row = creds.providers?.find((p) => p.provider_id === 'wan2gp');
            if (row?.credentials_preview?.base_url) {
              hostToProbe = row.credentials_preview.base_url;
              setUrl(hostToProbe);
            }
          } catch { /* ignore */ }
        }
        await probe(hostToProbe);
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
          provider_id: 'wan2gp',
          credentials: { base_url: url.trim() },
        }),
      });
      setMsg('URL Wan2GP guardada.');
      await probe(url.trim());
    } catch (e) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-xs text-white/45 py-4">Cargando Wan2GP…</div>;

  const readyCount = models.filter((m) => m.ready).length;

  return (
    <div className="space-y-3 border border-violet-500/20 rounded-lg bg-violet-500/[0.03] p-4">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <span className="text-violet-400">●</span> Wan2GP — video e imagen local
      </h3>
      <p className="text-[11px] text-white/45 leading-relaxed">
        Instala{' '}
        <a href="https://github.com/deepbeepmeep/Wan2GP" className="text-violet-300 underline" target="_blank" rel="noreferrer">
          Wan2GP
        </a>
        , inicia el servidor Gradio y elige modelos <strong className="text-white/70">(Wan2GP)</strong> en Image/Video Studio.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 h-9 rounded-md bg-black/30 border border-white/10 px-3 text-xs text-white/90 outline-none focus:border-violet-400/40"
          placeholder="http://127.0.0.1:7860"
        />
        <button type="button" onClick={() => void probe()} className="h-9 px-3 rounded-md bg-white/10 text-xs font-bold text-white/80">Probar</button>
        <button type="button" onClick={() => void handleSave()} disabled={saving} className="h-9 px-3 rounded-md bg-violet-500 text-black text-xs font-bold disabled:opacity-40">{saving ? '…' : 'Guardar'}</button>
      </div>
      {health && (
        <div className={`text-xs rounded-md px-3 py-2 border ${health.ok ? 'bg-violet-500/10 border-violet-500/30 text-violet-200' : 'bg-red-500/10 border-red-500/30 text-red-200'}`}>
          {health.ok ? `Wan2GP OK — ${readyCount}/${models.length} modelos listos` : `Error: ${health.error}`}
        </div>
      )}
      {msg && <div className="text-[11px] text-white/50">{msg}</div>}
    </div>
  );
}
