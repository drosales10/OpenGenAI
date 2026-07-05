import { LocalModelManager } from './LocalModelManager.js';
import { ProviderKeysPanel } from './ProviderKeysPanel.js';
import { isLocalAIAvailable } from '../lib/localInferenceClient.js';
import { getInternalApiBase, getInternalApiKey, setInternalApiBase, setInternalApiKey } from '../lib/internalApi.js';
import { syncMuapiKeyToBackend } from '../lib/syncMuapiKeyToBackend.js';
import { t } from '../lib/i18n.js';

export function SettingsModal(onClose) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:100;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:var(--bg-card,#111);border-radius:1rem;border:1px solid rgba(255,255,255,0.08);width:min(90vw,42rem);max-height:85vh;display:flex;flex-direction:column;overflow:hidden;';

    // ── Header ────────────────────────────────────────────────────────────────
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.5rem;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;';
    header.innerHTML = `
        <h2 style="font-size:1rem;font-weight:800;color:#fff;margin:0;">${t('settings.title')}</h2>
        <button id="settings-close-btn" style="color:rgba(255,255,255,0.4);background:none;border:none;cursor:pointer;padding:4px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
    `;
    modal.appendChild(header);

    // ── Tabs ──────────────────────────────────────────────────────────────────
    const TABS = [
        { id: 'api', label: t('settings.apiKey') },
        { id: 'provider-keys', label: 'Claves API' },
        { id: 'backend', label: 'Backend' },
        ...(isLocalAIAvailable() ? [{ id: 'local', label: t('settings.localModels') }] : []),
    ];

    let activeTab = 'api';

    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex;gap:0.25rem;padding:0.75rem 1.5rem 0;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;';

    const tabBtns = {};
    TABS.forEach(({ id, label }) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.style.cssText = 'padding:0.4rem 0.75rem;border-radius:0.5rem 0.5rem 0 0;font-size:0.75rem;font-weight:700;border:none;cursor:pointer;transition:all 0.15s;';
        btn.onclick = () => switchTab(id);
        tabBtns[id] = btn;
        tabBar.appendChild(btn);
    });
    modal.appendChild(tabBar);

    // ── Body ──────────────────────────────────────────────────────────────────
    const body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow-y:auto;padding:1.5rem;';
    modal.appendChild(body);

    // ── Tab: API Key ──────────────────────────────────────────────────────────
    const apiPanel = document.createElement('div');
    apiPanel.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:0.75rem;">
            <div>
                <label style="display:block;font-size:0.75rem;color:rgba(255,255,255,0.5);margin-bottom:0.4rem;font-weight:600;">${t('settings.muapiKeyLabel')}</label>
                <input id="settings-api-key" type="password"
                    style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.75rem;padding:0.6rem 0.9rem;color:#fff;font-size:0.875rem;outline:none;"
                    placeholder="${t('settings.keyPlaceholder')}"
                    value="${localStorage.getItem('muapi_key') || ''}">
            </div>
            <p style="font-size:0.7rem;color:rgba(255,255,255,0.3);margin:0;">
                ${t('settings.keyNote')}
            </p>
            <div style="display:flex;justify-content:flex-end;gap:0.5rem;margin-top:0.5rem;">
                <button id="settings-cancel-btn" style="padding:0.5rem 1rem;border-radius:0.5rem;background:none;border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.6);font-size:0.75rem;font-weight:700;cursor:pointer;">${t('common.cancel')}</button>
                <button id="settings-save-btn" style="padding:0.5rem 1rem;border-radius:0.5rem;background:var(--color-primary,#22d3ee);color:#000;font-size:0.75rem;font-weight:700;cursor:pointer;border:none;">${t('common.save')}</button>
            </div>
        </div>
    `;

    // ── Tab: Provider Keys ────────────────────────────────────────────────────
    let providerKeysPanel = null;

    // ── Tab: Local Models ─────────────────────────────────────────────────────
    const localPanel = LocalModelManager();

    // ── Tab: Backend ──────────────────────────────────────────────────────────
    const backendPanel = document.createElement('div');
    backendPanel.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:1rem;">
            <div style="padding:0.9rem;border:1px solid rgba(255,255,255,0.08);border-radius:0.75rem;background:rgba(255,255,255,0.02);display:flex;flex-direction:column;gap:0.6rem;">
                <div style="font-size:0.75rem;color:#fff;font-weight:700;">Internal Backend Access</div>
                <label style="display:block;font-size:0.7rem;color:rgba(255,255,255,0.5);font-weight:600;">Backend Base URL</label>
                <input id="settings-internal-base" type="text"
                    style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.5rem 0.75rem;color:#fff;font-size:0.8rem;outline:none;"
                    placeholder="http://localhost:3000"
                    value="${getInternalApiBase()}">
                <label style="display:block;font-size:0.7rem;color:rgba(255,255,255,0.5);font-weight:600;">Internal API Key</label>
                <input id="settings-internal-key" type="password"
                    style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.5rem 0.75rem;color:#fff;font-size:0.8rem;outline:none;"
                    placeholder="oga_live_..."
                    value="${getInternalApiKey()}">
                <div style="display:flex;flex-wrap:wrap;gap:0.5rem;justify-content:flex-end;">
                    <button id="settings-internal-save" style="padding:0.45rem 0.8rem;border-radius:0.5rem;background:none;border:1px solid rgba(255,255,255,0.18);color:#fff;font-size:0.72rem;font-weight:700;cursor:pointer;">Save Access</button>
                    <button id="settings-internal-bootstrap" style="padding:0.45rem 0.8rem;border-radius:0.5rem;background:var(--color-primary,#22d3ee);color:#000;border:none;font-size:0.72rem;font-weight:700;cursor:pointer;">Create Internal Key</button>
                </div>
            </div>

            <div style="padding:0.9rem;border:1px solid rgba(255,255,255,0.08);border-radius:0.75rem;background:rgba(255,255,255,0.02);display:flex;flex-direction:column;gap:0.6rem;">
                <div style="font-size:0.75rem;color:#fff;font-weight:700;">Database Controls</div>
                <div style="display:flex;gap:0.5rem;justify-content:flex-end;flex-wrap:wrap;">
                    <button id="settings-db-health" style="padding:0.45rem 0.8rem;border-radius:0.5rem;background:none;border:1px solid rgba(255,255,255,0.18);color:#fff;font-size:0.72rem;font-weight:700;cursor:pointer;">Check Health</button>
                    <button id="settings-db-init" style="padding:0.45rem 0.8rem;border-radius:0.5rem;background:rgba(34,211,238,0.18);border:1px solid rgba(34,211,238,0.35);color:#9cecf2;font-size:0.72rem;font-weight:700;cursor:pointer;">Initialize DB</button>
                </div>
            </div>

            <div style="padding:0.9rem;border:1px solid rgba(255,255,255,0.08);border-radius:0.75rem;background:rgba(255,255,255,0.02);display:flex;flex-direction:column;gap:0.8rem;">
                <div style="font-size:0.75rem;color:#fff;font-weight:700;">Job Defaults</div>
                <label style="display:flex;align-items:center;gap:0.45rem;color:rgba(255,255,255,0.85);font-size:0.78rem;">
                    <input id="settings-auto-approve" type="checkbox" checked>
                    Auto-approve new jobs
                </label>
                <div style="display:flex;flex-direction:column;gap:0.35rem;">
                    <label style="font-size:0.7rem;color:rgba(255,255,255,0.5);font-weight:600;">Default job status</label>
                    <select id="settings-default-job-status" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.5rem 0.75rem;color:#fff;font-size:0.8rem;outline:none;">
                        <option value="approved">approved</option>
                        <option value="pending">pending</option>
                    </select>
                </div>
                <div style="display:flex;gap:0.5rem;justify-content:flex-end;flex-wrap:wrap;">
                    <button id="settings-db-settings-load" style="padding:0.45rem 0.8rem;border-radius:0.5rem;background:none;border:1px solid rgba(255,255,255,0.18);color:#fff;font-size:0.72rem;font-weight:700;cursor:pointer;">Load</button>
                    <button id="settings-db-settings-save" style="padding:0.45rem 0.8rem;border-radius:0.5rem;background:var(--color-primary,#22d3ee);color:#000;border:none;font-size:0.72rem;font-weight:700;cursor:pointer;">Save</button>
                </div>
            </div>

            <div style="padding:0.9rem;border:1px solid rgba(255,255,255,0.08);border-radius:0.75rem;background:rgba(255,255,255,0.02);display:flex;flex-direction:column;gap:0.8rem;">
                <div style="font-size:0.75rem;color:#fff;font-weight:700;">Provider Quotas</div>
                <label style="display:flex;align-items:center;gap:0.45rem;color:rgba(255,255,255,0.85);font-size:0.78rem;">
                    <input id="settings-quota-enabled" type="checkbox">
                    Enable provider quotas
                </label>
                <div style="display:flex;gap:0.6rem;">
                    <div style="flex:1;display:flex;flex-direction:column;gap:0.35rem;">
                        <label style="font-size:0.7rem;color:rgba(255,255,255,0.5);font-weight:600;">Daily global</label>
                        <input id="settings-quota-global" type="number" min="0" step="1"
                            style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.5rem 0.75rem;color:#fff;font-size:0.8rem;outline:none;"
                            value="5000">
                    </div>
                    <div style="flex:1;display:flex;flex-direction:column;gap:0.35rem;">
                        <label style="font-size:0.7rem;color:rgba(255,255,255,0.5);font-weight:600;">Daily user</label>
                        <input id="settings-quota-user" type="number" min="0" step="1"
                            style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.5rem 0.75rem;color:#fff;font-size:0.8rem;outline:none;"
                            value="500">
                    </div>
                </div>
                <div style="display:flex;gap:0.6rem;">
                    <div style="flex:1;display:flex;flex-direction:column;gap:0.35rem;">
                        <label style="font-size:0.7rem;color:rgba(255,255,255,0.5);font-weight:600;">Daily project</label>
                        <input id="settings-quota-project" type="number" min="0" step="1"
                            style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.5rem 0.75rem;color:#fff;font-size:0.8rem;outline:none;"
                            value="1200">
                    </div>
                    <div style="flex:1;display:flex;flex-direction:column;gap:0.35rem;">
                        <label style="font-size:0.7rem;color:rgba(255,255,255,0.5);font-weight:600;">Minute global</label>
                        <input id="settings-quota-minute-global" type="number" min="0" step="1"
                            style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.5rem 0.75rem;color:#fff;font-size:0.8rem;outline:none;"
                            value="300">
                    </div>
                </div>
                <div style="display:flex;gap:0.6rem;">
                    <div style="flex:1;display:flex;flex-direction:column;gap:0.35rem;">
                        <label style="font-size:0.7rem;color:rgba(255,255,255,0.5);font-weight:600;">Minute user</label>
                        <input id="settings-quota-minute-user" type="number" min="0" step="1"
                            style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.5rem 0.75rem;color:#fff;font-size:0.8rem;outline:none;"
                            value="60">
                    </div>
                    <div style="flex:1;display:flex;flex-direction:column;gap:0.35rem;">
                        <label style="font-size:0.7rem;color:rgba(255,255,255,0.5);font-weight:600;">Minute project</label>
                        <input id="settings-quota-minute-project" type="number" min="0" step="1"
                            style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.5rem 0.75rem;color:#fff;font-size:0.8rem;outline:none;"
                            value="120">
                    </div>
                </div>
                <div style="display:flex;flex-direction:column;gap:0.35rem;">
                    <label style="font-size:0.7rem;color:rgba(255,255,255,0.5);font-weight:600;">Route overrides (JSON)</label>
                    <textarea id="settings-quota-overrides" rows="5"
                        style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.55rem 0.75rem;color:#fff;font-size:0.76rem;outline:none;font-family:ui-monospace,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;resize:vertical;"
                        placeholder='{"workflow:minute_global": 120, "agents:daily_user": 50}'>{}</textarea>
                </div>
                <div style="display:flex;gap:0.6rem;">
                    <div style="flex:1;display:flex;flex-direction:column;gap:0.35rem;">
                        <label style="font-size:0.7rem;color:rgba(255,255,255,0.5);font-weight:600;">Usage route group (optional)</label>
                        <input id="settings-quota-usage-route-group" type="text"
                            style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.5rem 0.75rem;color:#fff;font-size:0.8rem;outline:none;"
                            placeholder="workflow | agents | app | creative-agent">
                    </div>
                    <div style="flex:1;display:flex;flex-direction:column;gap:0.35rem;">
                        <label style="font-size:0.7rem;color:rgba(255,255,255,0.5);font-weight:600;">Usage project id (optional)</label>
                        <input id="settings-quota-usage-project" type="text"
                            style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.5rem 0.75rem;color:#fff;font-size:0.8rem;outline:none;"
                            placeholder="proj_1234">
                    </div>
                </div>
                <div style="display:flex;gap:0.5rem;justify-content:flex-end;flex-wrap:wrap;">
                    <button id="settings-quota-usage" style="padding:0.45rem 0.8rem;border-radius:0.5rem;background:none;border:1px solid rgba(255,255,255,0.18);color:#fff;font-size:0.72rem;font-weight:700;cursor:pointer;">Check Usage</button>
                    <button id="settings-quota-save" style="padding:0.45rem 0.8rem;border-radius:0.5rem;background:var(--color-primary,#22d3ee);color:#000;border:none;font-size:0.72rem;font-weight:700;cursor:pointer;">Save Quota</button>
                </div>
            </div>

            <div style="padding:0.9rem;border:1px solid rgba(255,255,255,0.08);border-radius:0.75rem;background:rgba(255,255,255,0.02);display:flex;flex-direction:column;gap:0.8rem;">
                <div style="font-size:0.75rem;color:#fff;font-weight:700;">MuAPI Provider (Server Side)</div>
                <label style="display:block;font-size:0.7rem;color:rgba(255,255,255,0.5);font-weight:600;">Provider Base URL</label>
                <input id="settings-provider-muapi-base" type="text"
                    style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.5rem 0.75rem;color:#fff;font-size:0.8rem;outline:none;"
                    placeholder="https://api.muapi.ai"
                    value="https://api.muapi.ai">
                <label style="display:block;font-size:0.7rem;color:rgba(255,255,255,0.5);font-weight:600;">Provider API Key</label>
                <input id="settings-provider-muapi-key" type="password"
                    style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.5rem 0.75rem;color:#fff;font-size:0.8rem;outline:none;"
                    placeholder="Stored only in backend DB setting">
                <div style="display:flex;gap:0.5rem;justify-content:flex-end;flex-wrap:wrap;">
                    <button id="settings-provider-muapi-status" style="padding:0.45rem 0.8rem;border-radius:0.5rem;background:none;border:1px solid rgba(255,255,255,0.18);color:#fff;font-size:0.72rem;font-weight:700;cursor:pointer;">Check</button>
                    <button id="settings-provider-muapi-save" style="padding:0.45rem 0.8rem;border-radius:0.5rem;background:var(--color-primary,#22d3ee);color:#000;border:none;font-size:0.72rem;font-weight:700;cursor:pointer;">Save Provider</button>
                </div>
            </div>

            <div style="padding:0.9rem;border:1px solid rgba(255,255,255,0.08);border-radius:0.75rem;background:rgba(255,255,255,0.02);display:flex;flex-direction:column;gap:0.8rem;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                    <div style="font-size:0.75rem;color:#fff;font-weight:700;">Users</div>
                    <button id="settings-users-refresh" style="padding:0.45rem 0.8rem;border-radius:0.5rem;background:none;border:1px solid rgba(255,255,255,0.18);color:#fff;font-size:0.72rem;font-weight:700;cursor:pointer;">Refresh</button>
                </div>
                <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
                    <input id="settings-users-email" type="email"
                        style="flex:1;min-width:10rem;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.5rem 0.75rem;color:#fff;font-size:0.8rem;outline:none;"
                        placeholder="new-user@domain.com">
                    <input id="settings-users-name" type="text"
                        style="flex:1;min-width:8rem;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.5rem 0.75rem;color:#fff;font-size:0.8rem;outline:none;"
                        placeholder="Display name">
                    <select id="settings-users-role" style="min-width:7rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.5rem 0.75rem;color:#fff;font-size:0.8rem;outline:none;">
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                    </select>
                    <button id="settings-users-create" style="padding:0.45rem 0.8rem;border-radius:0.5rem;background:var(--color-primary,#22d3ee);color:#000;border:none;font-size:0.72rem;font-weight:700;cursor:pointer;">Create / Upsert</button>
                </div>
                <div style="font-size:0.68rem;color:rgba(255,255,255,0.45);">Admin only: create users, change roles, and issue internal API keys.</div>
                <div id="settings-users-list" style="display:flex;flex-direction:column;gap:0.5rem;max-height:16rem;overflow:auto;"></div>
            </div>

            <div id="settings-backend-status" style="min-height:1.4rem;font-size:0.72rem;color:rgba(255,255,255,0.7);"></div>
        </div>
    `;

    const backendStatus = backendPanel.querySelector('#settings-backend-status');
    const baseInput = backendPanel.querySelector('#settings-internal-base');
    const keyInput = backendPanel.querySelector('#settings-internal-key');
    const autoApproveInput = backendPanel.querySelector('#settings-auto-approve');
    const defaultStatusInput = backendPanel.querySelector('#settings-default-job-status');
    const providerMuapiBaseInput = backendPanel.querySelector('#settings-provider-muapi-base');
    const providerMuapiKeyInput = backendPanel.querySelector('#settings-provider-muapi-key');
    const quotaEnabledInput = backendPanel.querySelector('#settings-quota-enabled');
    const quotaGlobalInput = backendPanel.querySelector('#settings-quota-global');
    const quotaUserInput = backendPanel.querySelector('#settings-quota-user');
    const quotaProjectInput = backendPanel.querySelector('#settings-quota-project');
    const quotaMinuteGlobalInput = backendPanel.querySelector('#settings-quota-minute-global');
    const quotaMinuteUserInput = backendPanel.querySelector('#settings-quota-minute-user');
    const quotaMinuteProjectInput = backendPanel.querySelector('#settings-quota-minute-project');
    const quotaOverridesInput = backendPanel.querySelector('#settings-quota-overrides');
    const quotaUsageRouteGroupInput = backendPanel.querySelector('#settings-quota-usage-route-group');
    const quotaUsageProjectInput = backendPanel.querySelector('#settings-quota-usage-project');
    const usersEmailInput = backendPanel.querySelector('#settings-users-email');
    const usersNameInput = backendPanel.querySelector('#settings-users-name');
    const usersRoleInput = backendPanel.querySelector('#settings-users-role');
    const usersList = backendPanel.querySelector('#settings-users-list');

    let usersState = [];
    let usersCurrentRole = null;
    let usersCurrentId = null;

    const setBackendStatus = (message, isError = false) => {
        backendStatus.textContent = message;
        backendStatus.style.color = isError ? '#fca5a5' : 'rgba(255,255,255,0.75)';
    };

    const getHeaders = (includeJson = true) => {
        const headers = {};
        const key = keyInput.value.trim();
        if (includeJson) headers['Content-Type'] = 'application/json';
        if (key) headers['x-internal-api-key'] = key;
        return headers;
    };

    const getEndpoint = (path) => {
        const base = baseInput.value.trim();
        return `${(base || '').replace(/\/$/, '')}${path}`;
    };

    const requestBackend = async (path, options = {}) => {
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

    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const renderUsers = () => {
        if (!usersState.length) {
            usersList.innerHTML = '<div style="font-size:0.72rem;color:rgba(255,255,255,0.45);padding:0.45rem 0.2rem;">No users yet.</div>';
            return;
        }

        const isAdmin = usersCurrentRole === 'admin';
        usersList.innerHTML = usersState.map((user) => {
            const userId = Number(user.id);
            const locked = !isAdmin || usersCurrentId === userId;
            const disabledAttr = locked ? 'disabled' : '';
            const rowOpacity = locked ? '0.75' : '1';
            return `
                <div style="border:1px solid rgba(255,255,255,0.08);border-radius:0.65rem;padding:0.55rem;display:flex;flex-direction:column;gap:0.45rem;opacity:${rowOpacity};">
                    <div style="display:flex;justify-content:space-between;gap:0.4rem;flex-wrap:wrap;align-items:center;">
                        <div style="font-size:0.72rem;color:#fff;font-weight:600;">#${userId} ${escapeHtml(user.email || 'no-email')}</div>
                        <div style="font-size:0.66rem;color:rgba(255,255,255,0.45);">keys ${Number(user.api_keys_active || 0)}/${Number(user.api_keys_total || 0)}</div>
                    </div>
                    <div style="display:flex;gap:0.45rem;flex-wrap:wrap;">
                        <input data-user-name="${userId}" type="text" value="${escapeHtml(user.display_name || '')}" ${disabledAttr}
                            style="flex:1;min-width:8rem;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.55rem;padding:0.45rem 0.65rem;color:#fff;font-size:0.74rem;outline:none;">
                        <select data-user-role="${userId}" ${disabledAttr}
                            style="min-width:6rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.55rem;padding:0.45rem 0.65rem;color:#fff;font-size:0.74rem;outline:none;">
                            <option value="user" ${user.role === 'user' ? 'selected' : ''}>user</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>admin</option>
                        </select>
                        <button data-user-save="${userId}" ${disabledAttr}
                            style="padding:0.4rem 0.65rem;border-radius:0.45rem;background:none;border:1px solid rgba(255,255,255,0.18);color:#fff;font-size:0.68rem;font-weight:700;cursor:pointer;">Save</button>
                        <button data-user-key="${userId}" ${disabledAttr}
                            style="padding:0.4rem 0.65rem;border-radius:0.45rem;background:rgba(34,211,238,0.18);border:1px solid rgba(34,211,238,0.35);color:#9cecf2;font-size:0.68rem;font-weight:700;cursor:pointer;">New Key</button>
                    </div>
                </div>
            `;
        }).join('');
    };

    const loadUsers = async () => {
        try {
            const data = await requestBackend('/api/db/users', { method: 'GET' });
            usersState = Array.isArray(data.users) ? data.users : [];
            usersCurrentRole = data.current_user_role || null;
            usersCurrentId = data.current_user_id ? Number(data.current_user_id) : null;
            renderUsers();
        } catch (error) {
            usersState = [];
            renderUsers();
            setBackendStatus(error.message, true);
        }
    };

    const parseQuotaOverrides = () => {
        const raw = (quotaOverridesInput.value || '').trim();
        if (!raw) return {};

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch {
            throw new Error('Route overrides JSON is invalid.');
        }

        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Route overrides must be a JSON object.');
        }

        return parsed;
    };

    const buildQuotaPolicyPayload = () => ({
        enabled: quotaEnabledInput.checked,
        daily_global_limit: Number(quotaGlobalInput.value || 0),
        daily_user_limit: Number(quotaUserInput.value || 0),
        daily_project_limit: Number(quotaProjectInput.value || 0),
        minute_global_limit: Number(quotaMinuteGlobalInput.value || 0),
        minute_user_limit: Number(quotaMinuteUserInput.value || 0),
        minute_project_limit: Number(quotaMinuteProjectInput.value || 0),
        route_overrides: parseQuotaOverrides(),
    });

    const loadBackendSettings = async () => {
        setBackendStatus('Loading settings...');
        try {
            const data = await requestBackend('/api/db/settings', { method: 'GET' });
            autoApproveInput.checked = data.auto_approve_jobs?.enabled !== false;
            defaultStatusInput.value = data.default_job_status?.value === 'pending' ? 'pending' : 'approved';
            quotaEnabledInput.checked = Boolean(data.provider_quota_policy?.enabled);
            quotaGlobalInput.value = Number.isFinite(Number(data.provider_quota_policy?.daily_global_limit))
                ? String(data.provider_quota_policy.daily_global_limit)
                : '5000';
            quotaUserInput.value = Number.isFinite(Number(data.provider_quota_policy?.daily_user_limit))
                ? String(data.provider_quota_policy.daily_user_limit)
                : '500';
            quotaProjectInput.value = Number.isFinite(Number(data.provider_quota_policy?.daily_project_limit))
                ? String(data.provider_quota_policy.daily_project_limit)
                : '1200';
            quotaMinuteGlobalInput.value = Number.isFinite(Number(data.provider_quota_policy?.minute_global_limit))
                ? String(data.provider_quota_policy.minute_global_limit)
                : '300';
            quotaMinuteUserInput.value = Number.isFinite(Number(data.provider_quota_policy?.minute_user_limit))
                ? String(data.provider_quota_policy.minute_user_limit)
                : '60';
            quotaMinuteProjectInput.value = Number.isFinite(Number(data.provider_quota_policy?.minute_project_limit))
                ? String(data.provider_quota_policy.minute_project_limit)
                : '120';
            quotaOverridesInput.value = JSON.stringify(data.provider_quota_policy?.route_overrides || {}, null, 2);
            setBackendStatus('Settings loaded.');
        } catch (error) {
            setBackendStatus(error.message, true);
        }
    };

    const loadProviderMuapiStatus = async () => {
        try {
            const status = await requestBackend('/api/providers/muapi/key', { method: 'GET' });
            providerMuapiBaseInput.value = status.base_url || 'https://api.muapi.ai';
            providerMuapiKeyInput.value = '';
            setBackendStatus(status.configured ? `MuAPI provider configured (${status.key_preview || 'masked'}).` : 'MuAPI provider key is not configured.');
        } catch (error) {
            setBackendStatus(error.message, true);
        }
    };

    backendPanel.querySelector('#settings-internal-save').onclick = () => {
        setInternalApiBase(baseInput.value.trim());
        setInternalApiKey(keyInput.value.trim());
        setBackendStatus('Internal backend access saved.');
    };

    backendPanel.querySelector('#settings-internal-bootstrap').onclick = async () => {
        setBackendStatus('Creating internal key...');
        try {
            const data = await fetch(getEndpoint('/api/auth/internal-key'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ auto_init: true }),
            }).then(async (res) => {
                const json = await res.json().catch(() => ({}));
                if (!res.ok || json.ok === false) {
                    throw new Error(json.error || `HTTP ${res.status}`);
                }
                return json;
            });

            if (data.api_key) {
                keyInput.value = data.api_key;
                setInternalApiKey(data.api_key);
            }
            setInternalApiBase(baseInput.value.trim());
            setBackendStatus(`Internal key created (${data.key_prefix || 'ok'}).`);
            await loadBackendSettings();
        } catch (error) {
            setBackendStatus(error.message, true);
        }
    };

    backendPanel.querySelector('#settings-db-health').onclick = async () => {
        setBackendStatus('Checking database health...');
        try {
            const data = await requestBackend('/api/db/health', { method: 'GET' });
            setBackendStatus(`DB OK: ${data.database}/${data.schema}`);
        } catch (error) {
            setBackendStatus(error.message, true);
        }
    };

    backendPanel.querySelector('#settings-db-init').onclick = async () => {
        setBackendStatus('Initializing database schema...');
        try {
            const data = await requestBackend('/api/db/init', { method: 'POST' });
            setBackendStatus(`DB initialized (${data.statements || 0} statements).`);
        } catch (error) {
            setBackendStatus(error.message, true);
        }
    };

    backendPanel.querySelector('#settings-db-settings-load').onclick = loadBackendSettings;
    backendPanel.querySelector('#settings-db-settings-save').onclick = async () => {
        setBackendStatus('Saving settings...');
        try {
            await requestBackend('/api/db/settings', {
                method: 'POST',
                body: JSON.stringify({
                    auto_approve_jobs: autoApproveInput.checked,
                    default_job_status: defaultStatusInput.value,
                    provider_quota_policy: buildQuotaPolicyPayload(),
                }),
            });
            setBackendStatus('Settings saved.');
        } catch (error) {
            setBackendStatus(error.message, true);
        }
    };

    backendPanel.querySelector('#settings-quota-save').onclick = async () => {
        setBackendStatus('Saving quota policy...');
        try {
            await requestBackend('/api/db/settings', {
                method: 'POST',
                body: JSON.stringify({
                    provider_quota_policy: buildQuotaPolicyPayload(),
                }),
            });
            setBackendStatus('Quota policy saved.');
        } catch (error) {
            setBackendStatus(error.message, true);
        }
    };

    backendPanel.querySelector('#settings-quota-usage').onclick = async () => {
        setBackendStatus('Loading usage snapshots...');
        try {
            const routeGroup = quotaUsageRouteGroupInput.value.trim();
            const projectId = quotaUsageProjectInput.value.trim();
            const dayParams = new URLSearchParams({ provider: 'muapi', period: 'day' });
            const minuteParams = new URLSearchParams({ provider: 'muapi', period: 'minute' });

            if (routeGroup) {
                dayParams.set('route_group', routeGroup);
                minuteParams.set('route_group', routeGroup);
            }

            if (projectId) {
                dayParams.set('project_id', projectId);
                minuteParams.set('project_id', projectId);
            }

            const dailyUsage = await requestBackend(`/api/db/usage?${dayParams.toString()}`, { method: 'GET' });
            const minuteUsage = await requestBackend(`/api/db/usage?${minuteParams.toString()}`, { method: 'GET' });
            const gd = dailyUsage.global?.accounted_requests ?? 0;
            const ud = dailyUsage.user?.accounted_requests ?? 0;
            const pd = dailyUsage.project?.accounted_requests ?? 0;
            const gm = minuteUsage.global?.accounted_requests ?? 0;
            const um = minuteUsage.user?.accounted_requests ?? 0;
            const pm = minuteUsage.project?.accounted_requests ?? 0;
            const scopeLabel = routeGroup ? ` (${routeGroup})` : '';
            const projectLabel = projectId ? ` project ${projectId}` : '';
            setBackendStatus(`Usage${scopeLabel}${projectLabel} day g/u/p: ${gd}/${ud}/${pd} | minute g/u/p: ${gm}/${um}/${pm}`);
        } catch (error) {
            setBackendStatus(error.message, true);
        }
    };

    backendPanel.querySelector('#settings-provider-muapi-status').onclick = async () => {
        setBackendStatus('Checking MuAPI provider status...');
        await loadProviderMuapiStatus();
    };

    backendPanel.querySelector('#settings-provider-muapi-save').onclick = async () => {
        setBackendStatus('Saving MuAPI provider settings...');
        try {
            const payload = {
                base_url: providerMuapiBaseInput.value.trim() || 'https://api.muapi.ai',
            };

            if (providerMuapiKeyInput.value.trim()) {
                payload.api_key = providerMuapiKeyInput.value.trim();
            }

            await requestBackend('/api/providers/muapi/key', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            providerMuapiKeyInput.value = '';
            await loadProviderMuapiStatus();
        } catch (error) {
            setBackendStatus(error.message, true);
        }
    };

    backendPanel.querySelector('#settings-users-refresh').onclick = async () => {
        setBackendStatus('Loading users...');
        await loadUsers();
        setBackendStatus('Users refreshed.');
    };

    backendPanel.querySelector('#settings-users-create').onclick = async () => {
        setBackendStatus('Saving user...');
        try {
            await requestBackend('/api/db/users', {
                method: 'POST',
                body: JSON.stringify({
                    email: usersEmailInput.value.trim(),
                    display_name: usersNameInput.value.trim(),
                    role: usersRoleInput.value,
                }),
            });

            usersEmailInput.value = '';
            usersNameInput.value = '';
            usersRoleInput.value = 'user';
            await loadUsers();
            setBackendStatus('User saved.');
        } catch (error) {
            setBackendStatus(error.message, true);
        }
    };

    usersList.addEventListener('click', async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const saveId = target.getAttribute('data-user-save');
        if (saveId) {
            setBackendStatus(`Updating user #${saveId}...`);
            try {
                const nameInput = usersList.querySelector(`[data-user-name="${saveId}"]`);
                const roleInput = usersList.querySelector(`[data-user-role="${saveId}"]`);
                await requestBackend('/api/db/users', {
                    method: 'PATCH',
                    body: JSON.stringify({
                        id: Number(saveId),
                        display_name: nameInput?.value ?? '',
                        role: roleInput?.value ?? 'user',
                    }),
                });
                await loadUsers();
                setBackendStatus(`User #${saveId} updated.`);
            } catch (error) {
                setBackendStatus(error.message, true);
            }
            return;
        }

        const keyId = target.getAttribute('data-user-key');
        if (keyId) {
            setBackendStatus(`Generating key for user #${keyId}...`);
            try {
                const data = await requestBackend('/api/db/users/keys', {
                    method: 'POST',
                    body: JSON.stringify({
                        user_id: Number(keyId),
                        key_name: `user-${keyId}-key`,
                    }),
                });

                const newKey = data.api_key || '';
                if (newKey) {
                    window.prompt('Copy new internal API key now (shown once):', newKey);
                }
                await loadUsers();
                setBackendStatus(`New key created for user #${keyId}.`);
            } catch (error) {
                setBackendStatus(error.message, true);
            }
        }
    });

    // ── Tab switching ─────────────────────────────────────────────────────────
    const switchTab = (id) => {
        activeTab = id;
        body.innerHTML = '';

        TABS.forEach(({ id: tid }) => {
            const btn = tabBtns[tid];
            if (tid === id) {
                btn.style.background = 'rgba(255,255,255,0.08)';
                btn.style.color = '#fff';
            } else {
                btn.style.background = 'transparent';
                btn.style.color = 'rgba(255,255,255,0.4)';
            }
        });

        if (id === 'api') body.appendChild(apiPanel);
        if (id === 'provider-keys') {
            providerKeysPanel = ProviderKeysPanel({
                getEndpoint,
                getHeaders,
                onStatus: setBackendStatus,
            });
            body.appendChild(providerKeysPanel);
        }
        if (id === 'backend') {
            body.appendChild(backendPanel);
            void loadBackendSettings();
            void loadProviderMuapiStatus();
            void loadUsers();
        }
        if (id === 'local') body.appendChild(localPanel);
    };

    switchTab('api');

    // ── API key save/cancel handlers ──────────────────────────────────────────
    const close = () => {
        if (document.body.contains(overlay)) document.body.removeChild(overlay);
        if (onClose) onClose();
    };

    apiPanel.querySelector('#settings-cancel-btn').onclick = close;
    apiPanel.querySelector('#settings-save-btn').onclick = async () => {
        const key = apiPanel.querySelector('#settings-api-key').value.trim();
        if (!key) {
            alert(t('settings.invalidKey'));
            return;
        }

        localStorage.setItem('muapi_key', key);
        try {
            const result = await syncMuapiKeyToBackend(key);
            if (!result.synced) {
                console.info('MuAPI key saved locally; internal key not configured for PostgreSQL sync.');
            }
            close();
        } catch (error) {
            alert(`Clave guardada localmente, pero falló la sincronización con PostgreSQL: ${error.message}`);
            close();
        }
    };

    header.querySelector('#settings-close-btn').onclick = close;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    overlay.appendChild(modal);
    return overlay;
}
