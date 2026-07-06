"use client";

import { AiAgent } from "ai-agent";
import "ai-agent/dist/tailwind.css";
import { useCallback, useEffect, useRef } from "react";
import axios from "axios";

const STORAGE_KEY = "muapi_key";
const INTERNAL_KEY_STORAGE = "internal_api_key";

/**
 * AgentChatClient — mirrors muapiapp's AgentClient.js.
 * Renders the AiAgent library component with server-fetched agent details
 * and optional initial history.
 *
 * IMPORTANT: StandaloneShell is NOT in the tree on /agents/* pages, so we
 * must set up our own axios interceptor here to inject the API key into
 * all requests made by the AiAgent library.
 */
export default function AgentChatClient({ agentDetails, initialHistory, userData }) {
  const interceptorRef = useRef(null);

  console.log("[AgentChatClient] Rendering", { 
    hasAgentDetails: !!agentDetails, 
    hasHistory: !!initialHistory, 
    hasUserData: !!userData 
  });

  useEffect(() => {
    const getMuapiKey = () => {
      if (typeof window === "undefined") return null;
      const fromStorage = localStorage.getItem(STORAGE_KEY);
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
    if (!muapiKey && !internalKey) return;

    interceptorRef.current = axios.interceptors.request.use((config) => {
      const isRelative =
        config.url.startsWith("/") || !config.url.startsWith("http");
      const isInternalProxy =
        config.url.includes("/api/app") ||
        config.url.includes("/api/workflow") ||
        config.url.includes("/api/agents") ||
        config.url.includes("/api/api") ||
        config.url.includes("/api/v1");

      if (!isRelative && !isInternalProxy) return config;

      if (internalKey) {
        config.headers["x-internal-api-key"] = internalKey;
      } else if (muapiKey) {
        config.headers["x-api-key"] = muapiKey;
      }

      if (config.url.includes("/api/api/v1/predictions/")) {
        config.headers["x-muapi-route-group"] = "agents";
      }

      return config;
    });

    return () => {
      if (interceptorRef.current !== null) {
        axios.interceptors.request.eject(interceptorRef.current);
      }
    };
  }, []);

  const useUser = useCallback(
    () => ({
      user: {
        username: userData?.email?.split("@")[0] || "Studio User",
        name: userData?.email?.split("@")[0] || "Studio User",
        email: userData?.email || null,
        profile_photo: null,
        balance: userData?.balance || 0,
      },
      isAuthorized: !!userData,
    }),
    [userData]
  );

  return (
    <div className="h-screen w-full bg-black">
      <AiAgent
        initialAgentDetails={agentDetails}
        initialHistory={initialHistory}
        useUser={useUser}
        usedIn="muapiapp"
      />
    </div>
  );
}
