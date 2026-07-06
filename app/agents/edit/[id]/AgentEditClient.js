"use client";

import { EditAgentPage } from "ai-agent";
import "ai-agent/dist/tailwind.css";
import { useCallback, useEffect, useRef } from "react";
import { installAgentAxiosAuth, ejectAgentAxiosAuth } from "../../agentAxiosAuth";

export default function AgentEditClient({ userData }) {
  const interceptorRef = useRef(null);

  useEffect(() => {
    interceptorRef.current = installAgentAxiosAuth();
    return () => ejectAgentAxiosAuth(interceptorRef.current);
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
      isAuthorized: true,
    }),
    [userData]
  );

  return (
    <EditAgentPage
      useUser={useUser}
      usedIn="studio"
    />
  );
}
