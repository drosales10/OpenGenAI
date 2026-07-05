'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getInternalApiBase, getInternalApiKey } from '@/src/lib/internalApi';

function StatusBadge({ configured }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
        configured
          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
          : 'bg-amber-500/10 text-amber-300 border border-amber-500/25'
      }`}
    >
      {configured ? 'Configurada' : 'Pendiente'}
    </span>
  );
}

function ProviderForm({ module, provider, storedPreview, onSave, onDelete, disabled }) {
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const initial = {};
    for (const field of provider.fields || []) {
      if (field.key === 'api_key') continue;
      initial[field.key] = storedPreview?.[field.key] || field.default || '';
    }
    setValues(initial);
  }, [provider, storedPreview]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const credentials = { ...values };
      const apiKey = values.api_key?.trim();
      if (apiKey) credentials.api_key = apiKey;

      await onSave(module.id, provider.id, credentials);
      setValues((prev) => ({ ...prev, api_key: '' }));
      setMessage('Guardado en PostgreSQL.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar credenciales de ${provider.label} en ${module.label}?`)) return;
    setSaving(true);
    setMessage('');
    try {
      await onDelete(module.id, provider.id);
      setMessage('Credenciales eliminadas.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (provider.readOnly) {
    return (
      <div className="text-xs text-white/45 italic py-2">
        Este proveedor no requiere clave API — se gestiona desde Modelos Locales.
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2 border-t border-white/[0.06]">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-bold text-white/85">{provider.label}</div>
          {provider.description && (
            <div className="text-[11px] text-white/40 mt-0.5">{provider.description}</div>
          )}
        </div>
        <StatusBadge configured={Boolean(storedPreview?.api_key)} />
      </div>

      {storedPreview?.api_key && (
        <div className="text-[11px] font-mono text-white/50 bg-black/30 border border-white/10 rounded px-2 py-1.5">
          Clave actual: {storedPreview.api_key}
        </div>
      )}

      {(provider.fields || []).map((field) => (
        <div key={field.key}>
          <label className="block text-[11px] font-semibold text-white/45 mb-1">
            {field.label}
            {field.required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
          <input
            type={field.type === 'password' ? 'password' : 'text'}
            value={field.key === 'api_key' ? (values.api_key || '') : (values[field.key] || '')}
            onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
            placeholder={
              field.key === 'api_key' && storedPreview?.api_key
                ? 'Dejar vacío para mantener la clave actual'
                : field.placeholder || ''
            }
            disabled={disabled || saving}
            className="w-full h-9 rounded-md bg-black/30 border border-white/10 px-3 text-sm text-white/90 outline-none focus:border-cyan-400/40 disabled:opacity-50"
          />
        </div>
      ))}

      {provider.docsUrl && (
        <a
          href={provider.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-[11px] text-cyan-300/80 hover:text-cyan-200 underline"
        >
          Obtener clave →
        </a>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => void handleSave()}
          disabled={disabled || saving}
          className="h-8 px-3 rounded-md bg-cyan-400 text-black text-[11px] font-bold hover:brightness-110 disabled:opacity-40"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        {storedPreview?.api_key && (
          <button
            onClick={() => void handleDelete()}
            disabled={disabled || saving}
            className="h-8 px-3 rounded-md bg-red-500/10 border border-red-400/25 text-red-300 text-[11px] font-bold hover:bg-red-500/20 disabled:opacity-40"
          >
            Eliminar
          </button>
        )}
      </div>

      {message && (
        <div className={`text-[11px] ${message.includes('Guardado') || message.includes('eliminadas') ? 'text-emerald-300' : 'text-red-300'}`}>
          {message}
        </div>
      )}
    </div>
  );
}

export default function ProviderKeysSettings({
  internalApiBase = '',
  internalApiKey = '',
  onStatusChange,
}) {
  const [catalog, setCatalog] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedModule, setExpandedModule] = useState('_global');
  const [search, setSearch] = useState('');

  const base = (internalApiBase || getInternalApiBase() || '').replace(/\/$/, '');
  const key = internalApiKey || getInternalApiKey() || '';

  const credentialMap = useMemo(() => {
    const map = {};
    for (const cred of credentials) {
      const mapKey = `${cred.module_id}:${cred.provider_id}`;
      map[mapKey] = cred.credentials_preview || {};
    }
    return map;
  }, [credentials]);

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
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return data;
  }, [base, key]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const catalogRes = await fetch('/api/providers/catalog?lang=es').then((r) => r.json());
      if (!catalogRes.ok) throw new Error(catalogRes.error || 'No se pudo cargar el catálogo');

      setCatalog(catalogRes);

      if (key) {
        const credRes = await requestApi('/api/providers/credentials');
        setCredentials(credRes.credentials || []);
        onStatusChange?.('Credenciales cargadas desde PostgreSQL.');
      } else {
        setCredentials([]);
        onStatusChange?.('Configura una clave interna para persistir en PostgreSQL.');
      }
    } catch (err) {
      setError(err.message);
      onStatusChange?.(err.message, true);
    } finally {
      setLoading(false);
    }
  }, [key, requestApi, onStatusChange]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSave = useCallback(async (moduleId, providerId, credentialsPayload) => {
    if (!key) throw new Error('Se requiere clave API interna para guardar en PostgreSQL.');
    await requestApi('/api/providers/credentials', {
      method: 'POST',
      body: JSON.stringify({
        module_id: moduleId,
        provider_id: providerId,
        credentials: credentialsPayload,
      }),
    });
    const credRes = await requestApi('/api/providers/credentials');
    setCredentials(credRes.credentials || []);
  }, [key, requestApi]);

  const handleDelete = useCallback(async (moduleId, providerId) => {
    if (!key) throw new Error('Se requiere clave API interna.');
    await requestApi(`/api/providers/credentials/${moduleId}?provider_id=${encodeURIComponent(providerId)}`, {
      method: 'DELETE',
    });
    const credRes = await requestApi('/api/providers/credentials');
    setCredentials(credRes.credentials || []);
  }, [key, requestApi]);

  const filteredCategories = useMemo(() => {
    if (!catalog?.categories) return [];
    const term = search.trim().toLowerCase();
    if (!term) return catalog.categories;

    return catalog.categories
      .map((cat) => ({
        ...cat,
        modules: cat.modules.filter(
          (mod) =>
            mod.label.toLowerCase().includes(term) ||
            mod.description?.toLowerCase().includes(term) ||
            mod.providers.some((p) => p.label?.toLowerCase().includes(term))
        ),
      }))
      .filter((cat) => cat.modules.length > 0);
  }, [catalog, search]);

  const configuredCount = credentials.filter((c) => c.configured).length;
  const totalModules = catalog?.categories?.reduce((acc, c) => acc + c.modules.filter((m) => !m.isGlobal || m.id === '_global').length, 0) || 0;

  if (loading) {
    return (
      <div className="text-sm text-white/45 py-8 text-center">
        Cargando catálogo de proveedores…
      </div>
    );
  }

  if (error && !catalog) {
    return (
      <div className="text-sm text-red-300 py-4 px-3 bg-red-500/10 border border-red-500/25 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!key && (
        <div className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2.5">
          Para guardar claves en PostgreSQL, configura primero el acceso al backend (URL + clave interna) en la pestaña Usuarios Admin.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="text-xs text-white/50">
          {configuredCount} proveedor(es) configurado(s)
          {totalModules > 0 && ` · ${totalModules} módulos`}
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
        placeholder="Buscar módulo o proveedor…"
        className="w-full h-9 rounded-md bg-white/5 border border-white/10 px-3 text-sm text-white/90 outline-none focus:border-cyan-400/30"
      />

      <div className="space-y-4 max-h-[52vh] overflow-y-auto pr-1">
        {filteredCategories.map((category) => (
          <section key={category.id}>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-white/35 mb-2 px-1">
              {category.label}
            </h3>
            <div className="space-y-2">
              {category.modules.map((mod) => {
                const isOpen = expandedModule === mod.id;
                const moduleConfigured = mod.providers.some(
                  (p) => credentialMap[`${mod.id}:${p.id}`]?.api_key || p.readOnly
                );

                return (
                  <div
                    key={mod.id}
                    className="border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedModule(isOpen ? null : mod.id)}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white">{mod.label}</span>
                          <StatusBadge configured={moduleConfigured} />
                          {mod.isGlobal && (
                            <span className="text-[10px] text-cyan-300/70 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                              fallback
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-white/40 truncate mt-0.5">{mod.description}</div>
                      </div>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className={`text-white/35 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>

                    {isOpen && (
                      <div className="px-3 pb-3 space-y-4">
                        {mod.modelKinds?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {mod.modelKinds.map((kind) => (
                              <span
                                key={kind}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/45 border border-white/10"
                              >
                                {kind}
                              </span>
                            ))}
                          </div>
                        )}
                        {mod.providers.map((provider) => (
                          <ProviderForm
                            key={`${mod.id}-${provider.id}`}
                            module={mod}
                            provider={provider}
                            storedPreview={credentialMap[`${mod.id}:${provider.id}`]}
                            onSave={handleSave}
                            onDelete={handleDelete}
                            disabled={!key}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
