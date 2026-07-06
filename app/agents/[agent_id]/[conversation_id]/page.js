import AgentChatClient from "../AgentChatClient";
import {
  resolveServerMuapiKey,
  fetchAgentDetailsServer,
  fetchConversationHistoryServer,
  fetchMuapiAccountServer,
} from "@/src/lib/server/agentsServerData";

/**
 * Server component — fetches both agentDetails and initialHistory
 * using muapi_key cookie or internal_api_key + DB credentials.
 *
 * URL: /agents/[agent_id]/[conversation_id]
 */
export async function generateMetadata() {
  return {
    title: `Agent Chat — Open Generative AI`,
  };
}

export default async function AgentConversationPage({ params }) {
  const { agent_id, conversation_id } = await params;
  const apiKey = await resolveServerMuapiKey("agents");

  const [agentDetails, initialHistory, userData] = await Promise.all([
    fetchAgentDetailsServer(agent_id, apiKey),
    fetchConversationHistoryServer(agent_id, conversation_id, apiKey),
    fetchMuapiAccountServer(apiKey),
  ]);

  return (
    <AgentChatClient
      agentDetails={agentDetails}
      initialHistory={initialHistory}
      userData={userData}
    />
  );
}
