import AgentChatClient from "../AgentChatClient";
import {
  resolveServerAgentUser,
  fetchAgentDetailsServer,
  fetchConversationHistoryServer,
  fetchMuapiAccountServer,
} from "@/src/lib/server/agentsServerData";

export async function generateMetadata() {
  return {
    title: `Agent Chat — Open Generative AI`,
  };
}

export default async function AgentConversationPage({ params }) {
  const { agent_id, conversation_id } = await params;
  const { userId } = await resolveServerAgentUser();

  const [agentDetails, initialHistory, userData] = await Promise.all([
    fetchAgentDetailsServer(agent_id, null, userId),
    fetchConversationHistoryServer(agent_id, conversation_id, null, userId),
    fetchMuapiAccountServer(null),
  ]);

  return (
    <AgentChatClient
      agentDetails={agentDetails}
      initialHistory={initialHistory}
      userData={userData}
    />
  );
}
