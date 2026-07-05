/**
 * Panel vanilla JS de claves API por módulo (Electron / SettingsModal).
 */

export function ProviderKeysPanel({ getEndpoint, getHeaders, onStatus }) {
  const container = document.createElement('div');
  container.style.cssText = 'display:flex;flex-direction:column;gap:0.75rem;';

  let catalog = null;
  let credentials = [];
  let expandedModule = '_global';
  let searchTerm = '';

  const setStatus = (msg, isError = false) => {
    if (onStatus) onStatus(msg, isError);
  };

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const credentialMap = () => {
    const map = {};
    for (const cred of credentials) {
      map[`${cred.module_id}:${cred.provider_id}`] = cred.credentials_preview || {};
    }
    return map;
  };

  const requestApi = async (path, options = {}) => {
    const response = await fetch(getEndpoint(path), {
      ...options,
      headers: {
        ...getHeaders(options.method !== 'GET'),
        ...(options.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return data;
  };

  const loadData = async () => {
    setStatus('Cargando catálogo…');
    try {
      const catalogRes = await fetch(getEndpoint('/api/providers/catalog?lang=es')).then((r) => r.json());
      if (!catalogRes.ok) throw new Error(catalogRes.error || 'Catálogo no disponible');
      catalog = catalogRes;

      try {
        const credRes = await requestApi('/api/providers/credentials');
        credentials = credRes.credentials || [];
        setStatus(`${credentials.filter((c) => c.configured).length} proveedor(es) configurado(s).`);
      } catch {
        credentials = [];
        setStatus('Configura clave interna para persistir en PostgreSQL.', true);
      }

      render();
    } catch (error) {
      setStatus(error.message, true);
      container.innerHTML = `<div style="color:#fca5a5;font-size:0.75rem;padding:0.5rem;">${escapeHtml(error.message)}</div>`;
    }
  };

  const saveCredentials = async (moduleId, providerId, creds) => {
    setStatus(`Guardando ${moduleId}/${providerId}…`);
    await requestApi('/api/providers/credentials', {
      method: 'POST',
      body: JSON.stringify({ module_id: moduleId, provider_id: providerId, credentials: creds }),
    });
    const credRes = await requestApi('/api/providers/credentials');
    credentials = credRes.credentials || [];
    setStatus('Guardado en PostgreSQL.');
    render();
  };

  const deleteCredentials = async (moduleId, providerId) => {
    if (!window.confirm('¿Eliminar credenciales?')) return;
    await requestApi(`/api/providers/credentials/${moduleId}?provider_id=${encodeURIComponent(providerId)}`, {
      method: 'DELETE',
    });
    const credRes = await requestApi('/api/providers/credentials');
    credentials = credRes.credentials || [];
    setStatus('Credenciales eliminadas.');
    render();
  };

  const renderProviderForm = (mod, provider, preview) => {
    if (provider.readOnly) {
      return `<div style="font-size:0.68rem;color:rgba(255,255,255,0.4);font-style:italic;padding:0.4rem 0;">Sin clave API — gestionar en Modelos Locales.</div>`;
    }

    const fieldsHtml = (provider.fields || []).map((field) => {
      const isKey = field.key === 'api_key';
      const val = isKey ? '' : (preview?.[field.key] || field.default || '');
      const ph = isKey && preview?.api_key ? 'Dejar vacío para mantener' : (field.placeholder || '');
      return `
        <label style="display:block;font-size:0.65rem;color:rgba(255,255,255,0.45);font-weight:600;margin-bottom:0.25rem;">${escapeHtml(field.label)}</label>
        <input data-field="${field.key}" data-module="${mod.id}" data-provider="${provider.id}" type="${field.type === 'password' ? 'password' : 'text'}" value="${escapeHtml(val)}" placeholder="${escapeHtml(ph)}"
          style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.55rem;padding:0.45rem 0.65rem;color:#fff;font-size:0.74rem;outline:none;margin-bottom:0.45rem;">
      `;
    }).join('');

    const previewHtml = preview?.api_key
      ? `<div style="font-size:0.65rem;font-family:monospace;color:rgba(255,255,255,0.5);background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:0.45rem;padding:0.35rem 0.5rem;margin-bottom:0.45rem;">Clave: ${escapeHtml(preview.api_key)}</div>`
      : '';

    const badge = preview?.api_key
      ? '<span style="font-size:0.6rem;padding:0.15rem 0.4rem;border-radius:0.25rem;background:rgba(16,185,129,0.15);color:#6ee7b7;border:1px solid rgba(16,185,129,0.3);">Configurada</span>'
      : '<span style="font-size:0.6rem;padding:0.15rem 0.4rem;border-radius:0.25rem;background:rgba(245,158,11,0.1);color:#fcd34d;border:1px solid rgba(245,158,11,0.25);">Pendiente</span>';

    return `
      <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:0.6rem;margin-top:0.6rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.45rem;">
          <div style="font-size:0.72rem;font-weight:700;color:#fff;">${escapeHtml(provider.label)}</div>
          ${badge}
        </div>
        ${previewHtml}
        ${fieldsHtml}
        <div style="display:flex;gap:0.4rem;">
          <button data-save-module="${mod.id}" data-save-provider="${provider.id}"
            style="padding:0.35rem 0.65rem;border-radius:0.45rem;background:var(--color-primary,#22d3ee);color:#000;border:none;font-size:0.68rem;font-weight:700;cursor:pointer;">Guardar</button>
          ${preview?.api_key ? `<button data-del-module="${mod.id}" data-del-provider="${provider.id}" style="padding:0.35rem 0.65rem;border-radius:0.45rem;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);color:#fca5a5;font-size:0.68rem;font-weight:700;cursor:pointer;">Eliminar</button>` : ''}
        </div>
      </div>
    `;
  };

  const render = () => {
    if (!catalog) return;

    const cmap = credentialMap();
    const term = searchTerm.trim().toLowerCase();

    const categoriesHtml = (catalog.categories || [])
      .map((cat) => {
        const modules = cat.modules.filter((mod) => {
          if (!term) return true;
          return mod.label.toLowerCase().includes(term) || (mod.description || '').toLowerCase().includes(term);
        });
        if (!modules.length) return '';

        const modulesHtml = modules.map((mod) => {
          const isOpen = expandedModule === mod.id;
          const configured = mod.providers.some((p) => cmap[`${mod.id}:${p.id}`]?.api_key || p.readOnly);
          const badge = configured
            ? '<span style="font-size:0.58rem;padding:0.12rem 0.35rem;border-radius:0.2rem;background:rgba(16,185,129,0.15);color:#6ee7b7;">OK</span>'
            : '<span style="font-size:0.58rem;padding:0.12rem 0.35rem;border-radius:0.2rem;background:rgba(245,158,11,0.1);color:#fcd34d;">—</span>';

          const providersHtml = isOpen
            ? mod.providers.map((p) => renderProviderForm(mod, p, cmap[`${mod.id}:${p.id}`])).join('')
            : '';

          return `
            <div style="border:1px solid rgba(255,255,255,0.08);border-radius:0.65rem;background:rgba(255,255,255,0.02);margin-bottom:0.45rem;overflow:hidden;">
              <button data-toggle-module="${mod.id}" style="width:100%;text-align:left;padding:0.55rem 0.65rem;background:none;border:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:0.5rem;">
                <div>
                  <div style="display:flex;align-items:center;gap:0.35rem;">
                    <span style="font-size:0.74rem;font-weight:700;color:#fff;">${escapeHtml(mod.label)}</span>
                    ${badge}
                  </div>
                  <div style="font-size:0.65rem;color:rgba(255,255,255,0.4);margin-top:0.15rem;">${escapeHtml(mod.description || '')}</div>
                </div>
                <span style="color:rgba(255,255,255,0.35);font-size:0.7rem;">${isOpen ? '▲' : '▼'}</span>
              </button>
              ${isOpen ? `<div style="padding:0 0.65rem 0.65rem;">${providersHtml}</div>` : ''}
            </div>
          `;
        }).join('');

        return `
          <div style="margin-bottom:0.75rem;">
            <div style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:rgba(255,255,255,0.35);margin-bottom:0.4rem;padding:0 0.15rem;">${escapeHtml(cat.label)}</div>
            ${modulesHtml}
          </div>
        `;
      })
      .join('');

    container.innerHTML = `
      <div style="font-size:0.68rem;color:rgba(255,255,255,0.45);margin-bottom:0.35rem;">
        Claves por módulo · persistencia PostgreSQL
      </div>
      <input id="provider-keys-search" type="text" placeholder="Buscar módulo…" value="${escapeHtml(searchTerm)}"
        style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.55rem;padding:0.45rem 0.65rem;color:#fff;font-size:0.74rem;outline:none;">
      <div style="max-height:50vh;overflow-y:auto;padding-right:0.25rem;">${categoriesHtml}</div>
    `;

    container.querySelector('#provider-keys-search')?.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      render();
    });

    container.querySelectorAll('[data-toggle-module]').forEach((btn) => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-toggle-module');
        expandedModule = expandedModule === id ? null : id;
        render();
      };
    });

    container.querySelectorAll('[data-save-module]').forEach((btn) => {
      btn.onclick = async () => {
        const moduleId = btn.getAttribute('data-save-module');
        const providerId = btn.getAttribute('data-save-provider');
        const creds = {};
        container.querySelectorAll(`[data-module="${moduleId}"][data-provider="${providerId}"]`).forEach((input) => {
          const key = input.getAttribute('data-field');
          const val = input.value.trim();
          if (val) creds[key] = val;
        });
        try {
          await saveCredentials(moduleId, providerId, creds);
        } catch (error) {
          setStatus(error.message, true);
        }
      };
    });

    container.querySelectorAll('[data-del-module]').forEach((btn) => {
      btn.onclick = async () => {
        const moduleId = btn.getAttribute('data-del-module');
        const providerId = btn.getAttribute('data-del-provider');
        try {
          await deleteCredentials(moduleId, providerId);
        } catch (error) {
          setStatus(error.message, true);
        }
      };
    });
  };

  void loadData();
  return container;
}
