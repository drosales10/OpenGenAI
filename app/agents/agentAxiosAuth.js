"use client";

import axios from "axios";

const MUAPI_KEY_STORAGE = "muapi_key";
const INTERNAL_KEY_STORAGE = "internal_api_key";

/**
 * Interceptor axios para páginas /agents/* (create, edit, chat).
 * Prioriza clave interna; las rutas /api/agents son locales en PostgreSQL.
 */
export function installAgentAxiosAuth() {
  const getMuapiKey = () => {
    if (typeof window === "undefined") return null;
    const fromStorage = localStorage.getItem(MUAPI_KEY_STORAGE);
    if (fromStorage) return fromStorage;
    const match = document.cookie.match(/muapi_key=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  };

  const getInternalKey = () => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(INTERNAL_KEY_STORAGE) || null;
    } catch {
      return null;
    }
  };

  const muapiKey = getMuapiKey();
  const internalKey = getInternalKey();

  return axios.interceptors.request.use((config) => {
    const url = config.url || "";
    const isRelative = url.startsWith("/") || !url.startsWith("http");
    const isInternalProxy =
      url.includes("/api/agents") ||
      url.includes("/api/app") ||
      url.includes("/api/workflow") ||
      url.includes("/api/api") ||
      url.includes("/api/v1");

    if (!isRelative && !isInternalProxy) return config;

    if (internalKey) {
      config.headers["x-internal-api-key"] = internalKey;
    } else if (muapiKey) {
      config.headers["x-api-key"] = muapiKey;
    }

    if (url.includes("/api/api/v1/predictions/")) {
      config.headers["x-muapi-route-group"] = "agents";
    }

    return config;
  });
}

export function ejectAgentAxiosAuth(interceptorId) {
  if (interceptorId !== null && interceptorId !== undefined) {
    axios.interceptors.request.eject(interceptorId);
  }
}
