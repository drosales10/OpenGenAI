import AgentCreateClient from "./AgentCreateClient";
import { fetchMuapiAccountServer } from "@/src/lib/server/agentsServerData";

export default async function CreateAgentPage() {
  const userData = await fetchMuapiAccountServer(null);

  return <AgentCreateClient userData={userData} />;
}
