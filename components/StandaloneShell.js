'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ImageStudio, VideoStudio, ClippingStudio, VibeMotionStudio, LipSyncStudio, RecastStudio, CinemaStudio, AudioStudio, MarketingStudio, WorkflowStudio, AgentStudio, AppsStudio, getUserBalance } from 'studio';
import { getInternalApiBase, getInternalApiKey, setInternalApiBase, setInternalApiKey } from '@/src/lib/internalApi';

const DesignAgentStudio = dynamic(() => import('studio').then(mod => mod.DesignAgentStudio), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-black flex items-center justify-center text-white/20">Loading Design Studio...</div>
});
import axios from 'axios';
import ApiKeyModal from './ApiKeyModal';
import ProviderKeysSettings from './ProviderKeysSettings';

const TABS = [
  { id: 'image',   label: 'Image Studio' },
  { id: 'video',   label: 'Video Studio' },
  { id: 'audio',   label: 'Audio Studio' },
  { id: 'clipping', label: 'AI Clipping' },
  { id: 'vibe-motion', label: 'Vibe Motion' },
  { id: 'lipsync', label: 'Lip Sync' },
  { id: 'body-swap', label: 'Body Swap' },
  { id: 'cinema',  label: 'Cinema Studio' },
  { id: 'marketing', label: 'Marketing Studio' },
  { id: 'workflows', label: 'Workflows' },
  { id: 'agents', label: 'Agents' },
  { id: 'design-agent', label: 'Design Agent' },
  { id: 'apps', label: 'Explore Apps' },
];

const STORAGE_KEY = 'muapi_key';

export default function StandaloneShell() {
  const params = useParams();
  const router = useRouter();
  const slug = useMemo(() => params?.slug || [], [params?.slug]);
  const idFromParams = params?.id;
  const tabFromParams = params?.tab;

  // Helper to extract workflow details precisely from either route structure
  const getWorkflowInfo = useCallback(() => {
    if (idFromParams) {
        return { id: idFromParams, tab: tabFromParams || null };
    }
    const wfIndex = slug.findIndex(s => s === 'workflows' || s === 'workflow');
    if (wfIndex === -1) return { id: null, tab: null };
    return {
      id: slug[wfIndex + 1] || null,
      tab: slug[wfIndex + 2] || null
    };
  }, [slug, idFromParams, tabFromParams]);

  const { id: urlWorkflowId } = getWorkflowInfo();

  // Initialize activeTab from URL slug/params or default to 'image'
  const getInitialTab = () => {
    if (idFromParams || slug.includes('workflow')) return 'workflows';
    if (slug.includes('agents')) return 'agents';
    if (slug.includes('design-agent')) return 'design-agent';
    if (slug.includes('apps')) return 'apps';
    const firstSegment = slug[0];
    if (firstSegment && TABS.find(t => t.id === firstSegment)) return firstSegment;
    return 'image';
  };
  
  const [apiKey, setApiKey] = useState(null);
  const [activeTab, setActiveTab] = useState(getInitialTab());

  const [balance, setBalance] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('general');
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [showVadooBanner, setShowVadooBanner] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('vadoo_banner_dismissed') !== '1';
    return true;
  });

  // Drag and Drop State
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState(null);

  // Settings > Users state
  const [internalApiBaseValue, setInternalApiBaseValue] = useState('');
  const [internalApiKeyValue, setInternalApiKeyValue] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersStatus, setUsersStatus] = useState('');
  const [users, setUsers] = useState([]);
  const [usersFilter, setUsersFilter] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [currentInternalUser, setCurrentInternalUser] = useState({ id: null, role: null });
  const [userKeysByUserId, setUserKeysByUserId] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [providerKeysStatus, setProviderKeysStatus] = useState('');

  // Sync tab with URL if user navigates manually or via browser back/forward
  useEffect(() => {
    const info = getWorkflowInfo();
    if (info.id) {
        setActiveTab('workflows');
    } else if (slug.includes('agents')) {
        setActiveTab('agents');
    } else if (slug.includes('design-agent')) {
        setActiveTab('design-agent');
    } else if (slug.includes('apps')) {
        setActiveTab('apps');
    } else {
        const firstSegment = slug[0];
        if (firstSegment && TABS.find(t => t.id === firstSegment)) {
          setActiveTab(firstSegment);
        }
    }
  }, [slug, getWorkflowInfo]);

  const handleTabChange = (tabId) => {
    router.push(`/studio/${tabId}`);
    // setActiveTab(tabId);
  };

  // Auto-hide header when inside a specific workflow view or design agent
  useEffect(() => {
    const isEditingWorkflow = (activeTab === 'workflows' || !!idFromParams) && urlWorkflowId;
    const isDesignAgent = activeTab === 'design-agent';
    
    if (isEditingWorkflow || isDesignAgent) {
      setIsHeaderVisible(false);
    } else {
      setIsHeaderVisible(true);
    }
  }, [activeTab, urlWorkflowId, idFromParams]);

  // Global builder CSS cleanup when switching away from Workflows or Design Agent tabs
  useEffect(() => {
    const fromBuilder = sessionStorage.getItem("fromWorkflowBuilder");
    const fromDesignAgent = sessionStorage.getItem("fromDesignAgent");
    
    if ((fromBuilder && activeTab !== 'workflows') || (fromDesignAgent && activeTab !== 'design-agent')) {
      sessionStorage.removeItem("fromWorkflowBuilder");
      sessionStorage.removeItem("fromDesignAgent");
      window.location.reload();
    }
  }, [activeTab]);

  const fetchBalance = useCallback(async (key) => {
    try {
      const data = await getUserBalance(key);
      setBalance(data.balance);
    } catch (err) {
      console.error('Balance fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    setHasMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setApiKey(stored);
      fetchBalance(stored);
      // Sync cookie immediately on mount to establish identity for background requests
      document.cookie = `muapi_key=${stored}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, [fetchBalance]);

  const handleKeySave = useCallback((key) => {
    localStorage.setItem(STORAGE_KEY, key);
    setApiKey(key);
    fetchBalance(key);
    document.cookie = `muapi_key=${key}; path=/; max-age=31536000; SameSite=Lax`;
  }, [fetchBalance]);

  const handleKeyChange = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey(null);
    setBalance(null);
    document.cookie = "muapi_key=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }, []);

  // Inject API key into all outgoing Axios requests (prop-based approach)
  // We use an interceptor to be selective and NOT send the key to external domains like S3
  useEffect(() => {
    // Safety: Clear any global defaults that might have been set previously
    delete axios.defaults.headers.common['x-api-key'];

    if (!apiKey) return;

    const interceptorId = axios.interceptors.request.use((config) => {
      // Check if URL is local/proxied
      const isRelative = config.url.startsWith('/') || !config.url.startsWith('http');
      const isInternalProxy = config.url.includes('/api/app') || config.url.includes('/api/workflow') || config.url.includes('/api/agents') || config.url.includes('/api/api') || config.url.includes('/api/v1');

      if (isRelative || isInternalProxy) {
        config.headers['x-api-key'] = apiKey;
      }
      
      return config;
    });

    return () => {
      axios.interceptors.request.eject(interceptorId);
    };
  }, [apiKey]);

  // Poll for balance every 30 seconds if key is present
  useEffect(() => {
    if (!apiKey) return;
    const interval = setInterval(() => fetchBalance(apiKey), 30000);
    return () => clearInterval(interval);
  }, [apiKey, fetchBalance]);

  // Drag and Drop Handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the container itself, not moving between children
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setDroppedFiles(files);
    }
  }, []);

  const handleFilesHandled = useCallback(() => {
    setDroppedFiles(null);
  }, []);

  const loadUsers = useCallback(async () => {
    if (!internalApiKeyValue.trim()) {
      setUsersStatus('Add an internal API key to manage users.');
      return;
    }

    setUsersLoading(true);
    try {
      const base = (internalApiBaseValue || '').trim().replace(/\/$/, '');
      const response = await fetch(`${base}/api/db/users`, {
        method: 'GET',
        headers: {
          'x-internal-api-key': internalApiKeyValue.trim(),
        },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setUsers(Array.isArray(data.users) ? data.users : []);
      setCurrentInternalUser({
        id: data.current_user_id ? Number(data.current_user_id) : null,
        role: data.current_user_role || null,
      });
      setUsersStatus('Users loaded.');
    } catch (error) {
      setUsersStatus(error.message || 'Failed to load users');
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [internalApiBaseValue, internalApiKeyValue]);

  const saveInternalAccess = useCallback(() => {
    setInternalApiBase(internalApiBaseValue.trim());
    setInternalApiKey(internalApiKeyValue.trim());
    setUsersStatus('Internal backend access saved.');
  }, [internalApiBaseValue, internalApiKeyValue]);

  const bootstrapInternalKey = useCallback(async () => {
    setUsersStatus('Creating internal key...');
    try {
      const base = (internalApiBaseValue || '').trim().replace(/\/$/, '');
      const response = await fetch(`${base}/api/auth/internal-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ auto_init: true }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const apiKeyValue = data.api_key || '';
      setInternalApiKeyValue(apiKeyValue);
      setInternalApiBase(internalApiBaseValue.trim());
      setInternalApiKey(apiKeyValue);
      setUsersStatus('Internal key created and saved.');
      await loadUsers();
    } catch (error) {
      setUsersStatus(error.message || 'Failed to create internal key');
    }
  }, [internalApiBaseValue, loadUsers]);

  const requestInternalApi = useCallback(async (path, options = {}) => {
    const base = (internalApiBaseValue || '').trim().replace(/\/$/, '');
    const response = await fetch(`${base}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(options.method && options.method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
        'x-internal-api-key': internalApiKeyValue.trim(),
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return data;
  }, [internalApiBaseValue, internalApiKeyValue]);

  const loadAuditLogs = useCallback(async () => {
    if (!internalApiKeyValue.trim()) return;

    setAuditLoading(true);
    try {
      const data = await requestInternalApi('/api/db/audit?limit=30', { method: 'GET' });
      setAuditLogs(Array.isArray(data.logs) ? data.logs : []);
    } catch {
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  }, [requestInternalApi, internalApiKeyValue]);

  const createOrUpsertUser = useCallback(async () => {
    setUsersStatus('Saving user...');
    try {
      await requestInternalApi('/api/db/users', {
        method: 'POST',
        body: JSON.stringify({
          email: newUserEmail.trim(),
          display_name: newUserName.trim(),
          role: newUserRole,
        }),
      });
      setNewUserEmail('');
      setNewUserName('');
      setNewUserRole('user');
      await loadUsers();
      await loadAuditLogs();
      setUsersStatus('User saved.');
    } catch (error) {
      setUsersStatus(error.message || 'Failed to save user');
    }
  }, [newUserEmail, newUserName, newUserRole, requestInternalApi, loadUsers, loadAuditLogs]);

  const updateUserRecord = useCallback(async (userId, displayName, role) => {
    setUsersStatus(`Updating user #${userId}...`);
    try {
      await requestInternalApi('/api/db/users', {
        method: 'PATCH',
        body: JSON.stringify({
          id: Number(userId),
          display_name: displayName,
          role,
        }),
      });
      await loadUsers();
      await loadAuditLogs();
      setUsersStatus(`User #${userId} updated.`);
    } catch (error) {
      setUsersStatus(error.message || 'Failed to update user');
    }
  }, [requestInternalApi, loadUsers, loadAuditLogs]);

  const loadUserKeys = useCallback(async (userId) => {
    setUsersStatus(`Loading keys for user #${userId}...`);
    try {
      const data = await requestInternalApi(`/api/db/users/keys?user_id=${Number(userId)}`, { method: 'GET' });
      setUserKeysByUserId((prev) => ({ ...prev, [userId]: data.keys || [] }));
      setUsersStatus(`Keys loaded for user #${userId}.`);
    } catch (error) {
      setUsersStatus(error.message || 'Failed to load keys');
    }
  }, [requestInternalApi]);

  const createUserKey = useCallback(async (userId) => {
    setUsersStatus(`Creating key for user #${userId}...`);
    try {
      const data = await requestInternalApi('/api/db/users/keys', {
        method: 'POST',
        body: JSON.stringify({
          user_id: Number(userId),
          key_name: `user-${userId}-key`,
        }),
      });

      if (data.api_key) {
        window.prompt('Copy this internal API key now (shown once):', data.api_key);
      }
      await loadUsers();
      await loadUserKeys(userId);
      await loadAuditLogs();
      setUsersStatus(`Key created for user #${userId}.`);
    } catch (error) {
      setUsersStatus(error.message || 'Failed to create key');
    }
  }, [requestInternalApi, loadUsers, loadUserKeys, loadAuditLogs]);

  const deactivateUserKey = useCallback(async (userId, keyId) => {
    setUsersStatus(`Deactivating key #${keyId}...`);
    try {
      await requestInternalApi('/api/db/users/keys', {
        method: 'PATCH',
        body: JSON.stringify({
          user_id: Number(userId),
          key_id: Number(keyId),
        }),
      });
      await loadUsers();
      await loadUserKeys(userId);
      await loadAuditLogs();
      setUsersStatus(`Key #${keyId} deactivated.`);
    } catch (error) {
      setUsersStatus(error.message || 'Failed to deactivate key');
    }
  }, [requestInternalApi, loadUsers, loadUserKeys, loadAuditLogs]);

  useEffect(() => {
    if (!showSettings) return;

    setInternalApiBaseValue(getInternalApiBase());
    setInternalApiKeyValue(getInternalApiKey());
  }, [showSettings, settingsTab]);

  useEffect(() => {
    if (!showSettings || settingsTab !== 'users') return;
    if (!internalApiKeyValue.trim()) return;
    void loadUsers();
    void loadAuditLogs();
  }, [showSettings, settingsTab, internalApiKeyValue, loadUsers, loadAuditLogs]);

  const filteredUsers = users.filter((user) => {
    const term = usersFilter.trim().toLowerCase();
    if (!term) return true;
    const haystack = `${user.id} ${user.email || ''} ${user.display_name || ''} ${user.role || ''}`.toLowerCase();
    return haystack.includes(term);
  });

  if (!hasMounted) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="animate-spin text-[#22d3ee] text-3xl">◌</div>
    </div>
  );

  if (!apiKey) {
    return <ApiKeyModal onSave={handleKeySave} />;
  }

  return (
    <div 
      className="h-screen bg-[#030303] flex flex-col overflow-hidden text-white relative"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-[100] bg-[#22d3ee]/10 backdrop-blur-md border-4 border-dashed border-[#22d3ee]/50 flex items-center justify-center pointer-events-none transition-all duration-300">
          <div className="bg-[#0a0a0a] p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center gap-4 scale-110 animate-pulse">
            <div className="w-20 h-20 bg-[#22d3ee] rounded-2xl flex items-center justify-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-white">Drop your media here</span>
              <span className="text-sm text-white/40">Images, videos, or audio files</span>
            </div>
          </div>
        </div>
      )}

      {/* Vadoo promo banner */}
      {showVadooBanner && (
        <div className="flex-shrink-0 w-full bg-indigo-600 flex items-center justify-center px-4 py-2 gap-3 relative z-50">
          <a
            href="https://vadoo.tv"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-bold text-white hover:opacity-80 transition-opacity text-center"
          >
            Unrestricted AI Images &amp; Videos → Auto-Publish as YouTube Shorts &amp; TikToks, Earn ↗
          </a>
          <button
            onClick={() => {
              setShowVadooBanner(false);
              localStorage.setItem('vadoo_banner_dismissed', '1');
            }}
            className="absolute right-3 text-white/60 hover:text-white transition-colors text-lg leading-none"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      {isHeaderVisible && (
        <header className="flex-shrink-0 h-14 border-b border-white/[0.03] flex items-center justify-between px-6 bg-black/20 backdrop-blur-md z-40 gap-4">
          {/* Left: Logo */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="text-sm font-bold tracking-tight hidden sm:block">OpenGenerativeAI</span>
          </div>

          {/* Center: Navigation Container with fade edges */}
          <div className="flex-1 min-w-0 mx-4 sm:mx-6 relative overflow-hidden h-full flex items-center justify-start lg:justify-center">
            {/* Fade Left Overlay */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#030303] to-transparent pointer-events-none z-10 block lg:hidden" />
            
            <nav className="flex items-center gap-4 overflow-x-auto scrollbar-none w-full lg:w-auto h-full px-4 lg:px-0">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative text-[13px] font-medium transition-all duration-300 whitespace-nowrap px-1 flex-shrink-0 flex items-center h-full ${
                    activeTab === tab.id
                      ? 'text-[#22d3ee]'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  <span className="relative z-10">{tab.label}</span>
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#22d3ee] to-[#a855f7] rounded-full shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                  )}
                </button>
              ))}
            </nav>
            
            {/* Fade Right Overlay */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#030303] to-transparent pointer-events-none z-10 block lg:hidden" />
          </div>

          {/* Right: Actions */}
          <div className="flex-shrink-0 flex items-center gap-4">
            <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 transition-colors">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white/90">
                  ${balance !== null ? `${balance}` : '---'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowSettings(true)}
              title="Settings — API key, local models, preferences"
              className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-white/10 bg-white/5 text-[13px] font-bold text-white/80 hover:text-white hover:bg-white/10 hover:border-white/20 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Settings</span>
            </button>
          </div>
        </header>
      )}

      {/* Studio Content */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {activeTab === 'image'   && <ImageStudio   apiKey={apiKey} droppedFiles={droppedFiles} onFilesHandled={handleFilesHandled} />}
        {activeTab === 'video'   && <VideoStudio   apiKey={apiKey} droppedFiles={droppedFiles} onFilesHandled={handleFilesHandled} />}
        {activeTab === 'clipping' && <ClippingStudio apiKey={apiKey} droppedFiles={droppedFiles} onFilesHandled={handleFilesHandled} />}
        {activeTab === 'vibe-motion' && <VibeMotionStudio apiKey={apiKey} />}
        {activeTab === 'lipsync' && <LipSyncStudio apiKey={apiKey} droppedFiles={droppedFiles} onFilesHandled={handleFilesHandled} />}
        {activeTab === 'body-swap' && <RecastStudio apiKey={apiKey} droppedFiles={droppedFiles} onFilesHandled={handleFilesHandled} />}
        {activeTab === 'cinema'  && <CinemaStudio  apiKey={apiKey} />}
        {activeTab === 'audio'   && <AudioStudio   apiKey={apiKey} droppedFiles={droppedFiles} onFilesHandled={handleFilesHandled} />}
        {activeTab === 'marketing' && <MarketingStudio apiKey={apiKey} droppedFiles={droppedFiles} onFilesHandled={handleFilesHandled} />}
        {activeTab === 'workflows' && <WorkflowStudio apiKey={apiKey} isHeaderVisible={isHeaderVisible} onToggleHeader={setIsHeaderVisible} />}
        {activeTab === 'agents' && <AgentStudio apiKey={apiKey} isHeaderVisible={isHeaderVisible} onToggleHeader={setIsHeaderVisible} />}
        {activeTab === 'design-agent' && <DesignAgentStudio apiKey={apiKey} isHeaderVisible={isHeaderVisible} onToggleHeader={setIsHeaderVisible} />}
        {activeTab === 'apps' && <AppsStudio apiKey={apiKey} />}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-up">
          <div className={`bg-[#0a0a0a] border border-white/10 rounded-xl p-6 w-full ${settingsTab === 'users' || settingsTab === 'provider-keys' ? 'max-w-5xl' : 'max-w-sm'} shadow-2xl max-h-[90vh] overflow-y-auto`}>
            <h2 className="text-white font-bold text-lg mb-2">Settings</h2>
            <p className="text-white/40 text-[13px] mb-5">
              Manage your AI studio preferences and authentication.
            </p>

            <div className="flex gap-2 mb-5">
              <button
                onClick={() => setSettingsTab('general')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-colors ${settingsTab === 'general' ? 'bg-white/10 text-white border-white/20' : 'bg-white/5 text-white/60 border-white/10 hover:text-white'}`}
              >
                General
              </button>
              <button
                onClick={() => setSettingsTab('provider-keys')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-colors ${settingsTab === 'provider-keys' ? 'bg-white/10 text-white border-white/20' : 'bg-white/5 text-white/60 border-white/10 hover:text-white'}`}
              >
                Claves API
              </button>
              <button
                onClick={() => setSettingsTab('users')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-colors ${settingsTab === 'users' ? 'bg-white/10 text-white border-white/20' : 'bg-white/5 text-white/60 border-white/10 hover:text-white'}`}
              >
                Users Admin
              </button>
            </div>

            {settingsTab === 'general' && (
              <div className="space-y-4 mb-7">
                <div className="bg-white/5 border border-white/[0.03] rounded-md p-4">
                  <label className="block text-xs font-bold text-white/30 mb-2">
                    Active API Key
                  </label>
                  <div className="text-[13px] font-mono text-white/80">
                    {apiKey.slice(0, 8)}••••••••••••••••
                  </div>
                </div>
              </div>
            )}

            {settingsTab === 'provider-keys' && (
              <div className="space-y-3 mb-5">
                <p className="text-white/40 text-[13px]">
                  Configura tus propias claves API por módulo. Se almacenan de forma persistente en PostgreSQL.
                </p>
                <ProviderKeysSettings
                  internalApiBase={internalApiBaseValue}
                  internalApiKey={internalApiKeyValue}
                  onStatusChange={(msg) => setProviderKeysStatus(msg)}
                />
                {providerKeysStatus && (
                  <div className="text-xs text-white/55">{providerKeysStatus}</div>
                )}
              </div>
            )}

            {settingsTab === 'users' && (
              <div className="space-y-4 mb-5">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 bg-white/5 border border-white/[0.03] rounded-md p-3">
                  <input
                    value={internalApiBaseValue}
                    onChange={(e) => setInternalApiBaseValue(e.target.value)}
                    placeholder="Backend base URL (e.g. http://localhost:3001)"
                    className="h-10 rounded-md bg-black/30 border border-white/10 px-3 text-sm text-white/90 outline-none"
                  />
                  <input
                    value={internalApiKeyValue}
                    onChange={(e) => setInternalApiKeyValue(e.target.value)}
                    placeholder="Internal API key"
                    type="password"
                    className="h-10 rounded-md bg-black/30 border border-white/10 px-3 text-sm text-white/90 outline-none"
                  />
                  <button
                    onClick={saveInternalAccess}
                    className="h-10 rounded-md bg-[#22d3ee] text-black text-xs font-bold hover:brightness-110 transition-all"
                  >
                    Save Access
                  </button>
                  <button
                    onClick={() => void bootstrapInternalKey()}
                    className="h-10 rounded-md bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 text-xs font-bold hover:bg-cyan-500/30 transition-all"
                  >
                    Create Internal Key
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 bg-white/5 border border-white/[0.03] rounded-md p-3">
                  <input
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="new-user@domain.com"
                    className="h-10 rounded-md bg-black/30 border border-white/10 px-3 text-sm text-white/90 outline-none"
                  />
                  <input
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Display name"
                    className="h-10 rounded-md bg-black/30 border border-white/10 px-3 text-sm text-white/90 outline-none"
                  />
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="h-10 rounded-md bg-black/30 border border-white/10 px-3 text-sm text-white/90 outline-none"
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                  <button
                    onClick={createOrUpsertUser}
                    disabled={currentInternalUser.role !== 'admin'}
                    className="h-10 rounded-md bg-[#22d3ee] text-black text-xs font-bold hover:brightness-110 transition-all disabled:opacity-40"
                  >
                    Create / Upsert
                  </button>
                </div>

                <div className="flex gap-3">
                  <input
                    value={usersFilter}
                    onChange={(e) => setUsersFilter(e.target.value)}
                    placeholder="Filter by id, email, name, role"
                    className="flex-1 h-10 rounded-md bg-white/5 border border-white/10 px-3 text-sm text-white/90 outline-none"
                  />
                  <button
                    onClick={() => {
                      void loadUsers();
                      void loadAuditLogs();
                    }}
                    className="h-10 px-4 rounded-md bg-white/10 text-white text-xs font-bold hover:bg-white/15 transition-all"
                  >
                    Refresh
                  </button>
                </div>

                {currentInternalUser.role !== 'admin' && (
                  <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
                    Your current internal role is not admin. User create/update/key actions are restricted.
                  </div>
                )}

                <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
                  {filteredUsers.map((user) => {
                    const isSelf = Number(user.id) === Number(currentInternalUser.id || 0);
                    const userKeys = userKeysByUserId[user.id] || [];
                    return (
                      <div key={user.id} className="border border-white/10 rounded-md p-3 bg-white/[0.02]">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="text-sm font-semibold text-white">#{user.id} {user.email || 'no-email'}</div>
                          <div className="text-[11px] text-white/45">keys {Number(user.api_keys_active || 0)}/{Number(user.api_keys_total || 0)}</div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-2">
                          <input
                            defaultValue={user.display_name || ''}
                            id={`user-name-${user.id}`}
                            className="lg:col-span-2 h-9 rounded-md bg-black/30 border border-white/10 px-3 text-sm text-white/90 outline-none"
                          />
                          <select
                            defaultValue={user.role || 'user'}
                            id={`user-role-${user.id}`}
                            disabled={isSelf}
                            className="h-9 rounded-md bg-black/30 border border-white/10 px-3 text-sm text-white/90 outline-none disabled:opacity-50"
                            title={isSelf ? 'You cannot edit your own role' : 'User role'}
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                          <button
                            onClick={() => {
                              const nameInput = document.getElementById(`user-name-${user.id}`);
                              const roleInput = document.getElementById(`user-role-${user.id}`);
                              const nameValue = nameInput?.value || '';
                              const roleValue = isSelf ? user.role : (roleInput?.value || user.role);
                              void updateUserRecord(user.id, nameValue, roleValue);
                            }}
                            disabled={currentInternalUser.role !== 'admin'}
                            className="h-9 rounded-md bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all disabled:opacity-40"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => void createUserKey(user.id)}
                            disabled={currentInternalUser.role !== 'admin'}
                            className="h-9 rounded-md bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 text-xs font-bold hover:bg-cyan-500/30 transition-all disabled:opacity-40"
                          >
                            New Key
                          </button>
                        </div>

                        {isSelf && (
                          <div className="mt-2 text-[11px] text-amber-300">Self-role lock: you can edit your display name, but not your own role.</div>
                        )}

                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => void loadUserKeys(user.id)}
                            className="h-8 px-3 rounded-md bg-white/5 border border-white/10 text-white/80 text-[11px] font-bold hover:bg-white/10 transition-all"
                          >
                            Load Keys
                          </button>
                        </div>

                        {userKeys.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {userKeys.map((key) => (
                              <div key={key.id} className="flex flex-wrap items-center gap-2 text-[11px] bg-black/30 border border-white/10 rounded px-2 py-1.5">
                                <span className="text-white/85 font-mono">{key.key_prefix}...</span>
                                <span className={`px-1.5 py-0.5 rounded ${key.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-500/20 text-zinc-300'}`}>
                                  {key.is_active ? 'active' : 'inactive'}
                                </span>
                                <span className="text-white/45">{key.key_name || 'key'}</span>
                                {key.is_active && currentInternalUser.role === 'admin' && (
                                  <button
                                    onClick={() => void deactivateUserKey(user.id, key.id)}
                                    className="ml-auto px-2 py-1 rounded bg-red-500/15 border border-red-400/30 text-red-300 hover:bg-red-500/25 transition-all"
                                  >
                                    Deactivate
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {!filteredUsers.length && (
                    <div className="text-sm text-white/45 border border-white/10 rounded-md p-4 text-center">
                      {usersLoading ? 'Loading users...' : 'No users found for current filter.'}
                    </div>
                  )}
                </div>

                <div className={`text-xs ${usersStatus.toLowerCase().includes('fail') || usersStatus.toLowerCase().includes('error') ? 'text-red-300' : 'text-white/55'}`}>
                  {usersStatus || 'Users panel ready.'}
                </div>

                <div className="border border-white/10 rounded-md p-3 bg-white/[0.02]">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="text-xs font-bold text-white/70">Recent Admin Actions</div>
                    <button
                      onClick={() => void loadAuditLogs()}
                      className="h-7 px-2 rounded bg-white/10 text-white/80 text-[11px] font-bold hover:bg-white/20"
                    >
                      Reload
                    </button>
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="text-[11px] text-white/70 bg-black/30 border border-white/10 rounded px-2 py-1.5">
                        <div>
                          <span className="text-cyan-300">{log.action}</span>
                          <span className="text-white/40"> by </span>
                          <span>{log.actor_email || `user#${log.actor_user_id || 'unknown'}`}</span>
                        </div>
                        <div className="text-white/45">{new Date(log.created_at).toLocaleString()}</div>
                      </div>
                    ))}
                    {!auditLogs.length && (
                      <div className="text-[11px] text-white/45 border border-white/10 rounded px-2 py-2 text-center">
                        {auditLoading ? 'Loading audit logs...' : 'No audit logs yet.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {settingsTab === 'general' && (
                <button
                  onClick={handleKeyChange}
                  className="flex-1 h-10 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-all"
                >
                  Change Key
                </button>
              )}
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 h-10 rounded-md bg-white/5 text-white/80 hover:bg-white/10 text-xs font-semibold transition-all border border-white/5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
