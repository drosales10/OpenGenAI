import AgentChatClient from "./AgentChatClient";
import {
  resolveServerMuapiKey,
  fetchAgentDetailsServer,
  fetchMuapiAccountServer,
} from "@/src/lib/server/agentsServerData";

/**
 * Server component — fetches agentDetails for a new chat session.
 *
 * URL: /agents/[agent_id]
 */
export async function generateMetadata() {
  return {
    title: `Agent Chat — Open Generative AI`,
  };
}

export default async function AgentPage({ params }) {
  const { agent_id } = await params;
  const apiKey = await resolveServerMuapiKey("agents");

  const [agentDetails, userData] = await Promise.all([
    fetchAgentDetailsServer(agent_id, apiKey),
    fetchMuapiAccountServer(apiKey),
  ]);

  return (
    <AgentChatClient
      agentDetails={agentDetails}
      initialHistory={null}
      userData={userData}
    />
  );
}
