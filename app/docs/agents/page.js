import { redirect } from 'next/navigation';

/** Enlace legacy /docs/agents → Studio Agents */
export default function DocsAgentsRedirect() {
  redirect('/studio/agents');
}
