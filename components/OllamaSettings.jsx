'use client';

import { useCallback, useEffect, useState } from 'react';
import { getInternalApiBase, getInternalApiKey } from '@/src/lib/internalApi';

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="h-6 px-2 rounded bg-white/10 text-[10px] text-white/70 hover:bg-white/15 shrink-0"
    >
      {copied ? '✓' : 'Copiar'}
    </button>
  );
}

export default function OllamaSettings({ internalApiBase = '', internalApiKey = '' }) {
  const [host, setHost] = useState('http://127.0.0.1:11434');
  const [health, setHealth] = useState(null);
  const [substitutes, setSubstitutes] = useState(null);
  const [installed, setInstalled] = useState([]);
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
    const h = encodeURIComponent(hostOverride || host);
    const healthRes = await fetch(`/api/ollama/health?host=${h}`).then((r) => r.json());
    setHealth(healthRes);
    if (healthRes.ok) {
      const modelsRes = await fetch(`/api/ollama/models?host=${h}`).then((r) => r.json());
      if (modelsRes.ok) setInstalled(modelsRes.models || []);
    } else {
      setInstalled([]);
    }
  }, [host]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sub = await fetch('/api/ollama/substitutes?lang=es').then((r) => r.json());
      if (sub.ok) setSubstitutes(sub);

      let hostToProbe = host;
      if (key) {
        try {
          const creds = await requestApi('/api/providers/credentials?module_id=_global');
          const ollama = creds.providers?.find((p) => p.provider_id === 'ollama');
          if (ollama?.credentials_preview?.base_url) {
            hostToProbe = ollama.credentials_preview.base_url;
            setHost(hostToProbe);
          }
        } catch {
          /* sin credenciales guardadas */
        }
      }
      await probe(hostToProbe);
    } finally {
      setLoading(false);
    }
  }, [key, requestApi, probe, host]);

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveHost = async () => {
    if (!key) {
      setMsg('Configura la clave interna para guardar el host en PostgreSQL.');
      return;
    }
    setSaving(true);
    setMsg('');
    try {
      await requestApi('/api/providers/credentials', {
        method: 'POST',
        body: JSON.stringify({
          module_id: '_global',
          provider_id: 'ollama',
          credentials: { base_url: host.trim() },
        }),
      });
      setMsg('Host Ollama guardado.');
      await probe(host.trim());
    } catch (e) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-xs text-white/45 py-4">Cargando Ollama…</div>;
  }

  return (
    <div className="space-y-4 border border-emerald-500/20 rounded-lg bg-emerald-500/[0.03] p-4">
      <div>
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span className="text-emerald-400">●</span> Ollama — inferencia local open source
        </h3>
        <p className="text-[11px] text-white/45 mt-1 leading-relaxed">
          Instala Ollama, descarga modelos con <code className="text-emerald-300/80">ollama pull</code> y
          elige modelos <strong className="text-white/70">(Ollama)</strong> en Image Studio. Sin clave API.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="url"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="http://127.0.0.1:11434"
          className="flex-1 h-9 rounded-md bg-black/30 border border-white/10 px-3 text-xs text-white/90 outline-none focus:border-emerald-400/40"
        />
        <button
          type="button"
          onClick={() => void probe()}
          className="h-9 px-3 rounded-md bg-white/10 text-white/80 text-xs font-bold hover:bg-white/15"
        >
          Probar
        </button>
        <button
          type="button"
          onClick={() => void handleSaveHost()}
          disabled={saving}
          className="h-9 px-3 rounded-md bg-emerald-500 text-black text-xs font-bold hover:brightness-110 disabled:opacity-40"
        >
          {saving ? '…' : 'Guardar host'}
        </button>
      </div>

      {health && (
        <div
          className={`text-xs rounded-md px-3 py-2 border ${
            health.ok
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : 'bg-red-500/10 border-red-500/30 text-red-200'
          }`}
        >
          {health.ok
            ? `Ollama conectado — ${installed.length} modelo(s) instalado(s)`
            : `No se pudo conectar: ${health.error}`}
        </div>
      )}
      {msg && <div className="text-[11px] text-white/50">{msg}</div>}

      {substitutes?.ollamaPullCommands?.length > 0 && (
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/35 mb-2">
            Descargar modelos (terminal)
          </h4>
          <div className="space-y-1.5">
            {substitutes.ollamaPullCommands.map((cmd) => (
              <div
                key={cmd.id}
                className="flex items-center gap-2 rounded-md bg-black/25 border border-white/[0.06] px-2 py-1.5"
              >
                <code className="flex-1 text-[10px] font-mono text-emerald-200/90 truncate">{cmd.pull}</code>
                <span className="text-[9px] text-white/30 hidden sm:inline">{cmd.size}</span>
                <CopyButton text={cmd.pull} />
              </div>
            ))}
          </div>
        </div>
      )}

      {installed.length > 0 && (
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/35 mb-2">
            Instalados en tu Ollama
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {installed.map((m) => (
              <span
                key={m.name}
                className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60 font-mono"
              >
                {m.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {substitutes?.mappings?.length > 0 && (
        <details className="group">
          <summary className="text-xs font-semibold text-white/60 cursor-pointer hover:text-white/80 list-none flex items-center gap-2">
            <span className="text-white/30 group-open:rotate-90 transition-transform">▶</span>
            Sustitutos open source por modelo de pago
          </summary>
          <div className="mt-3 space-y-3 max-h-[40vh] overflow-y-auto pr-1">
            {substitutes.mappings.map((row) => (
              <div key={row.paidFamily} className="rounded-md border border-white/[0.06] bg-black/20 p-2.5">
                <div className="text-xs font-semibold text-white/85">{row.paidFamily}</div>
                <div className="text-[10px] text-white/35 font-mono mb-2">{row.paidExamples?.join(', ')}</div>
                <ul className="space-y-1.5">
                  {row.substitutes.map((s, i) => (
                    <li key={i} className="text-[11px] text-white/55 flex flex-col sm:flex-row sm:items-center gap-1">
                      <span className="text-emerald-300/80 shrink-0">{s.engineLabel}</span>
                      <span className="font-mono text-white/70">{s.model}</span>
                      {s.pull && (
                        <span className="flex items-center gap-1">
                          <code className="text-[10px] text-white/40 truncate max-w-[200px]">{s.pull}</code>
                          <CopyButton text={s.pull} />
                        </span>
                      )}
                      {s.note && <span className="text-white/35 italic">— {s.note}</span>}
                    </li>
                  ))}
                </ul>
                {row.videoNote && (
                  <p className="text-[10px] text-amber-300/70 mt-2">{row.videoNote}</p>
                )}
              </div>
            ))}
          </div>
        </details>
      )}

      {substitutes?.notes?.length > 0 && (
        <ul className="text-[10px] text-white/35 space-y-1 list-disc pl-4">
          {substitutes.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
