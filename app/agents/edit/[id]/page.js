import AgentEditClient from "./AgentEditClient";
import { fetchMuapiAccountServer } from "@/src/lib/server/agentsServerData";

export default async function EditAgentPage({ params }) {
  const userData = await fetchMuapiAccountServer(null);

  return <AgentEditClient userData={userData} />;
}
