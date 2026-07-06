'use client';

import { useCallback, useEffect, useState } from 'react';
import { getInternalApiBase, getInternalApiKey } from '@/src/lib/internalApi';

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="h-6 px-2 rounded bg-white/10 text-[10px] text-white/70 hover:bg-white/15 shrink-0"
    >
      {copied ? '✓' : 'Copiar'}
    </button>
  );
}

export default function LocalAudioSettings({ internalApiBase = '', internalApiKey = '' }) {
  const [host, setHost] = useState('http://127.0.0.1:8765');
  const [health, setHealth] = useState(null);
  const [hints, setHints] = useState([]);
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

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const setup = await fetch('/api/local-audio/setup').then((r) => r.json());
        if (setup.ok) setHints(setup.hints || []);
        let hostToProbe = host;
        if (key) {
          try {
            const creds = await requestApi('/api/providers/credentials?module_id=_global');
            const row = creds.providers?.find((p) => p.provider_id === 'local_audio');
            if (row?.credentials_preview?.base_url) {
              hostToProbe = row.credentials_preview.base_url;
              setHost(hostToProbe);
            }
          } catch { /* ignore */ }
        }
        const h = encodeURIComponent(hostToProbe);
        const healthRes = await fetch(`/api/local-audio/health?host=${h}`).then((r) => r.json());
        setHealth(healthRes);
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!key) { setMsg('Configura la clave interna para guardar.'); return; }
    setSaving(true);
    try {
      await requestApi('/api/providers/credentials', {
        method: 'POST',
        body: JSON.stringify({
          module_id: '_global',
          provider_id: 'local_audio',
          credentials: { base_url: host.trim() },
        }),
      });
      setMsg('Host audio local guardado.');
    } catch (e) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-xs text-white/45 py-4">Cargando audio local…</div>;

  const startCmd = 'python scripts/local_audio_server.py';

  return (
    <div className="space-y-3 border border-amber-500/20 rounded-lg bg-amber-500/[0.03] p-4">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <span className="text-amber-400">●</span> Audio local — MusicGen / ACE-Step / XTTS
      </h3>
      <p className="text-[11px] text-white/45 leading-relaxed">
        Ejecuta el servidor incluido y elige modelos <strong className="text-white/70">MusicGen (local)</strong> en Audio Studio
        o genera voz con <strong className="text-white/70">XTTS</strong> en Lip Sync Studio.
      </p>
      <div className="flex items-center gap-2 rounded-md bg-black/25 border border-white/[0.06] px-2 py-1.5">
        <code className="flex-1 text-[10px] font-mono text-amber-200/90 truncate">{startCmd}</code>
        <CopyButton text={startCmd} />
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="url"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          className="flex-1 h-9 rounded-md bg-black/30 border border-white/10 px-3 text-xs text-white/90 outline-none focus:border-amber-400/40"
          placeholder="http://127.0.0.1:8765"
        />
        <button type="button" onClick={() => void handleSave()} disabled={saving} className="h-9 px-3 rounded-md bg-amber-500 text-black text-xs font-bold disabled:opacity-40">{saving ? '…' : 'Guardar'}</button>
      </div>
      {health && (
        <div className={`text-xs rounded-md px-3 py-2 border ${health.ok ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-red-500/10 border-red-500/30 text-red-200'}`}>
          {health.ok ? 'Servidor de audio conectado' : `Sin conexión: ${health.error}`}
        </div>
      )}
      {hints.length > 0 && (
        <ul className="text-[10px] text-white/35 space-y-1 list-disc pl-4">
          {hints.map((h) => (
            <li key={h.id}>{h.engine} {h.model}: {h.hint}</li>
          ))}
        </ul>
      )}
      {msg && <div className="text-[11px] text-white/50">{msg}</div>}
    </div>
  );
}
