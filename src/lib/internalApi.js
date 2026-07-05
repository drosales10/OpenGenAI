const INTERNAL_API_BASE_KEY = 'internal_api_base';
const INTERNAL_API_KEY_KEY = 'internal_api_key';

function setInternalApiCookie(apiKey) {
  if (typeof document === 'undefined') return;

  if (!apiKey) {
    document.cookie = 'internal_api_key=; Max-Age=0; Path=/; SameSite=Lax';
    return;
  }

  const encoded = encodeURIComponent(apiKey);
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `internal_api_key=${encoded}; Max-Age=${oneYear}; Path=/; SameSite=Lax`;
}

export function getInternalApiBase() {
  const stored = localStorage.getItem(INTERNAL_API_BASE_KEY);
  if (stored) return stored.replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    if (window.location.port === '5173') {
      return '/internal-api';
    }

    // In Next dev/prod, use same-origin API by default.
    return window.location.origin;
  }

  return 'http://localhost:3000';
}

export function setInternalApiBase(baseUrl) {
  if (!baseUrl) {
    localStorage.removeItem(INTERNAL_API_BASE_KEY);
    return;
  }

  localStorage.setItem(INTERNAL_API_BASE_KEY, baseUrl.replace(/\/$/, ''));
}

export function getInternalApiKey() {
  const key = localStorage.getItem(INTERNAL_API_KEY_KEY) || '';
  if (key) {
    setInternalApiCookie(key);
  }
  return key;
}

export function setInternalApiKey(apiKey) {
  if (!apiKey) {
    localStorage.removeItem(INTERNAL_API_KEY_KEY);
    setInternalApiCookie('');
    return;
  }

  localStorage.setItem(INTERNAL_API_KEY_KEY, apiKey);
  setInternalApiCookie(apiKey);
}

export function buildInternalApiUrl(path) {
  return `${getInternalApiBase()}${path}`;
}

export function withInternalApiKeyHeaders(extraHeaders = {}) {
  const apiKey = getInternalApiKey();
  return apiKey
    ? { ...extraHeaders, 'x-internal-api-key': apiKey }
    : { ...extraHeaders };
}
