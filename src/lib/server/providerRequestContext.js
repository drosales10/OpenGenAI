export function extractProviderRequestContext(request) {
  const url = new URL(request.url);

  const headerProjectId = request.headers.get('x-project-id')
    || request.headers.get('x-workflow-id')
    || request.headers.get('x-agent-id');

  const queryProjectId = url.searchParams.get('project_id')
    || url.searchParams.get('projectId')
    || url.searchParams.get('workflow_id')
    || url.searchParams.get('workflowId')
    || url.searchParams.get('agent_id')
    || url.searchParams.get('agentId');

  const projectId = (headerProjectId || queryProjectId || '').trim() || null;

  return {
    projectId,
  };
}
