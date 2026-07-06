import { redirect } from 'next/navigation';

/** /agents → listado de agentes en el Studio */
export default function AgentsIndexRedirect() {
  redirect('/studio/agents');
}
