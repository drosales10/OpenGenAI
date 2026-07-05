import { query } from '@/src/lib/postgres';

function extractProjectIdFromMeta(requestMeta = {}) {
  if (requestMeta.project_id) return String(requestMeta.project_id);
  if (requestMeta.projectId) return String(requestMeta.projectId);

  const queryText = typeof requestMeta.query === 'string' ? requestMeta.query : '';
  if (!queryText) return null;

  try {
    const params = new URLSearchParams(queryText.startsWith('?') ? queryText.slice(1) : queryText);
    return params.get('project_id') || params.get('projectId') || params.get('workflow_id') || params.get('workflowId');
  } catch {
    return null;
  }
}

export async function recordProviderRequest(log) {
  try {
    const requestMeta = log.requestMeta || {};
    const projectId = log.projectId || extractProjectIdFromMeta(requestMeta);

    await query(
      `INSERT INTO provider_request_logs (
        provider,
        route_group,
        method,
        target_path,
        project_id,
        status_code,
        duration_ms,
        auth_mode,
        user_id,
        request_meta
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
      [
        log.provider,
        log.routeGroup,
        log.method,
        log.targetPath,
        projectId || null,
        log.statusCode ?? null,
        log.durationMs ?? null,
        log.authMode || 'unknown',
        log.userId || null,
        JSON.stringify(requestMeta),
      ]
    );
  } catch (error) {
    console.warn('[ProviderUsage] Failed to record provider request:', error.message);
  }
}
