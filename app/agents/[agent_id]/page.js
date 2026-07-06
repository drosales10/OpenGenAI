import AgentChatClient from "./AgentChatClient";
import {
  resolveServerAgentUser,
  fetchAgentDetailsServer,
  fetchMuapiAccountServer,
} from "@/src/lib/server/agentsServerData";

export async function generateMetadata() {
  return {
    title: `Agent Chat — Open Generative AI`,
  };
}

export default async function AgentPage({ params }) {
  const { agent_id } = await params;
  const { userId } = await resolveServerAgentUser();

  const [agentDetails, userData] = await Promise.all([
    fetchAgentDetailsServer(agent_id, null, userId),
    fetchMuapiAccountServer(null),
  ]);

  return (
    <AgentChatClient
      agentDetails={agentDetails}
      initialHistory={null}
      userData={userData}
    />
  );
}
