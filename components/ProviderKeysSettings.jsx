'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getInternalApiBase, getInternalApiKey } from '@/src/lib/internalApi';

function StatusBadge({ configured, supportsDirect, routing }) {
  if (routing === 'direct') {
    return (
      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
        Directo
      </span>
    );
  }
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
        configured
          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
          : supportsDirect
            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/25'
            : 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/25'
      }`}
    >
      {configured ? 'Clave OK' : supportsDirect ? 'Requiere clave' : 'MuAPI'}
    </span>
  );
}

function ModelKeyRow({ model, stored, onSave, onDelete, disabled }) {
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSave = async () => {
    if (!apiKey.trim() && !stored?.configured) {
      setMsg('Ingresa tu clave API.');
      return;
    }
    setSaving(true);
    setMsg('');
    try {
      const credentials = {};
      if (apiKey.trim()) credentials.api_key = apiKey.trim();
      await onSave(model, credentials);
      setApiKey('');
      setMsg('Guardado.');
    } catch (e) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-start py-2 border-b border-white/[0.05] last:border-0">
      <div className="lg:col-span-4 min-w-0">
        <div className="text-xs font-semibold text-white/90 truncate">{model.name}</div>
        <div className="text-[10px] text-white/35 font-mono truncate">{model.model_key}</div>
      </div>
      <div className="lg:col-span-2 flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/55 border border-white/10">
          {model.provider_label}
        </span>
        {model.supports_direct && (
          <span className="text-[10px] text-cyan-300/70">API directa</span>
        )}
      </div>
      <div className="lg:col-span-4">
        {stored?.credentials_preview?.api_key && (
          <div className="text-[10px] font-mono text-white/45 mb-1">{stored.credentials_preview.api_key}</div>
        )}
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          disabled={disabled || saving}
          placeholder={stored?.configured ? 'Nueva clave (opcional)' : `Clave ${model.provider_label}…`}
          className="w-full h-8 rounded-md bg-black/30 border border-white/10 px-2.5 text-xs text-white/90 outline-none focus:border-cyan-400/40 disabled:opacity-50"
        />
        {model.provider_docs_url && (
          <a
            href={model.provider_docs_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-cyan-300/70 hover:text-cyan-200 underline mt-1 inline-block"
          >
            Obtener clave
          </a>
        )}
      </div>
      <div className="lg:col-span-2 flex gap-1.5 items-center">
        <StatusBadge
          configured={Boolean(stored?.configured)}
          supportsDirect={model.supports_direct}
          routing={stored?.configured && model.supports_direct ? 'direct' : null}
        />
        <button
          onClick={() => void handleSave()}
          disabled={disabled || saving}
          className="h-7 px-2 rounded bg-cyan-400 text-black text-[10px] font-bold hover:brightness-110 disabled:opacity-40"
        >
          {saving ? '…' : 'Guardar'}
        </button>
        {stored?.configured && (
          <button
            onClick={() => void onDelete(model.model_key)}
            disabled={disabled || saving}
            className="h-7 px-2 rounded bg-red-500/10 border border-red-400/25 text-red-300 text-[10px] font-bold disabled:opacity-40"
          >
            ✕
          </button>
        )}
      </div>
      {msg && <div className="lg:col-span-12 text-[10px] text-white/50">{msg}</div>}
    </div>
  );
}

export default function ProviderKeysSettings({
  internalApiBase = '',
  internalApiKey = '',
  onStatusChange,
}) {
  const [catalog, setCatalog] = useState(null);
  const [modelsState, setModelsState] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedModule, setExpandedModule] = useState('image_studio');
  const [search, setSearch] = useState('');

  const base = (internalApiBase || getInternalApiBase() || '').replace(/\/$/, '');
  const key = internalApiKey || getInternalApiKey() || '';

  const credMap = useMemo(() => {
    const map = {};
    for (const m of modelsState) {
      map[m.model_key] = m;
    }
    return map;
  }, [modelsState]);

  const requestApi = useCallback(async (path, options = {}) => {
    const response = await fetch(`${base}${path}`, {
      ...options,
      headers: {
        ...(options.method && options.method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
        ...(key ? { 'x-internal-api-key': key } : {}),
        ...(options.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  }, [base, key]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const catalogRes = await fetch('/api/providers/catalog?lang=es').then((r) => r.json());
      if (!catalogRes.ok) throw new Error(catalogRes.error);
      setCatalog(catalogRes);

      if (key) {
        const modelsRes = await requestApi('/api/providers/models?lang=es');
        setModelsState(modelsRes.models || []);
        onStatusChange?.(`${modelsRes.models?.length || 0} modelos en catálogo.`);
      } else {
        onStatusChange?.('Configura clave interna para guardar en PostgreSQL.');
      }
    } catch (err) {
      onStatusChange?.(err.message, true);
    } finally {
      setLoading(false);
    }
  }, [key, requestApi, onStatusChange]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleSaveModel = useCallback(async (model, credentials) => {
    if (!key) throw new Error('Se requiere clave interna.');
    await requestApi('/api/providers/models', {
      method: 'POST',
      body: JSON.stringify({
        model_key: model.model_key,
        provider_id: model.provider_id,
        module_id: model.module_id,
        credentials,
        routing_mode: model.supports_direct ? 'auto' : 'muapi',
      }),
    });
    const modelsRes = await requestApi('/api/providers/models?lang=es');
    setModelsState(modelsRes.models || []);
  }, [key, requestApi]);

  const handleDeleteModel = useCallback(async (modelKey) => {
    if (!key) return;
    await requestApi(`/api/providers/models?model_key=${encodeURIComponent(modelKey)}`, { method: 'DELETE' });
    await loadData();
  }, [key, requestApi, loadData]);

  const filteredCategories = useMemo(() => {
    if (!catalog?.categories) return [];
    const term = search.trim().toLowerCase();
    if (!term) return catalog.categories;

    return catalog.categories
      .map((cat) => ({
        ...cat,
        modules: cat.modules
          .map((mod) => ({
            ...mod,
            models: (mod.models || []).filter(
              (m) =>
                m.name.toLowerCase().includes(term)
                || m.model_key.toLowerCase().includes(term)
                || m.provider_label?.toLowerCase().includes(term)
            ),
          }))
          .filter((mod) => mod.models?.length > 0 || mod.label.toLowerCase().includes(term)),
      }))
      .filter((cat) => cat.modules.length > 0);
  }, [catalog, search]);

  const totalModels = catalog?.categories?.reduce(
    (acc, c) => acc + c.modules.reduce((a, m) => a + (m.models?.length || 0), 0),
    0
  ) || 0;
  const configuredCount = modelsState.filter((m) => m.configured).length;

  if (loading) {
    return <div className="text-sm text-white/45 py-8 text-center">Cargando modelos…</div>;
  }

  return (
    <div className="space-y-4">
      {!key && (
        <div className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2.5">
          Para guardar claves propias (Gemini, OpenAI, etc.) en PostgreSQL, configura primero el acceso al backend en <strong>Usuarios Admin</strong>.
        </div>
      )}

      <div className="text-xs text-white/45 bg-white/[0.03] border border-white/10 rounded-md px-3 py-2.5 leading-relaxed">
        Configura tu clave de Google AI Studio. Imagen: <span className="text-cyan-300">gemini-3.1-flash-image</span> y <span className="text-cyan-300">gemini-3-pro-image</span>.
        Video Veo: <span className="text-cyan-300">veo-3.1-generate-preview</span> (con audio). También puedes usar <span className="text-cyan-300">GOOGLE_API_KEY</span> en el .env del servidor.
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="text-xs text-white/50">
          {configuredCount} / {totalModels} modelos con clave propia
        </div>
        <button
          onClick={() => void loadData()}
          className="h-8 px-3 rounded-md bg-white/10 text-white/80 text-[11px] font-bold hover:bg-white/15"
        >
          Recargar
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar modelo (Gemini, Flux, Kling…)"
        className="w-full h-9 rounded-md bg-white/5 border border-white/10 px-3 text-sm text-white/90 outline-none focus:border-cyan-400/30"
      />

      <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
        {filteredCategories.map((category) => (
          <section key={category.id}>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-white/35 mb-2 px-1">
              {category.label}
            </h3>
            {category.modules.map((mod) => {
              if (!mod.models?.length && mod.id !== 'local_inference') return null;
              const isOpen = expandedModule === mod.id;
              const modConfigured = (mod.models || []).filter((m) => credMap[m.model_key]?.configured).length;

              return (
                <div key={mod.id} className="border border-white/10 rounded-lg bg-white/[0.02] mb-2 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedModule(isOpen ? null : mod.id)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-white/[0.03]"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{mod.label}</span>
                        <span className="text-[10px] text-white/40">{mod.model_count || mod.models?.length || 0} modelos</span>
                        {modConfigured > 0 && (
                          <span className="text-[10px] text-emerald-300">{modConfigured} configurados</span>
                        )}
                      </div>
                      <div className="text-[11px] text-white/40">{mod.description}</div>
                    </div>
                    <span className="text-white/35 text-xs">{isOpen ? '▲' : '▼'}</span>
                  </button>

                  {isOpen && mod.models?.length > 0 && (
                    <div className="px-3 pb-3">
                      <div className="hidden lg:grid grid-cols-12 gap-2 text-[10px] font-bold text-white/30 uppercase pb-1 border-b border-white/[0.06] mb-1">
                        <div className="col-span-4">Modelo</div>
                        <div className="col-span-2">Proveedor</div>
                        <div className="col-span-4">Clave API</div>
                        <div className="col-span-2">Estado</div>
                      </div>
                      {mod.models.map((model) => (
                        <ModelKeyRow
                          key={model.model_key}
                          model={{ ...model, module_id: mod.id }}
                          stored={credMap[model.model_key]}
                          onSave={handleSaveModel}
                          onDelete={handleDeleteModel}
                          disabled={!key}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
