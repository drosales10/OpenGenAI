import { query } from '@/src/lib/postgres';
import { isAutoApprovalEnabled } from '@/src/lib/db/settings';

export async function createJob(jobInput) {
  const autoApproved = jobInput.autoApproved ?? await isAutoApprovalEnabled();
  const approvalStatus = jobInput.approvalStatus || (autoApproved ? 'approved' : 'pending');
  const status = jobInput.status || (autoApproved ? 'approved' : 'pending');

  const result = await query(
    `INSERT INTO jobs (
      request_id,
      user_id,
      provider,
      job_type,
      status,
      approval_status,
      auto_approved,
      payload,
      result,
      error_message,
      completed_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11)
    RETURNING *`,
    [
      jobInput.requestId || null,
      jobInput.userId || null,
      jobInput.provider,
      jobInput.jobType,
      status,
      approvalStatus,
      autoApproved,
      JSON.stringify(jobInput.payload || {}),
      jobInput.result ? JSON.stringify(jobInput.result) : null,
      jobInput.errorMessage || null,
      jobInput.completedAt || null,
    ]
  );

  return result.rows[0] || null;
}

export async function getJobById(jobId) {
  const result = await query('SELECT * FROM jobs WHERE id = $1', [jobId]);
  return result.rows[0] || null;
}

export async function getJobByRequestId(requestId) {
  const result = await query('SELECT * FROM jobs WHERE request_id = $1', [requestId]);
  return result.rows[0] || null;
}

export async function listJobs(limit = 25) {
  const safeLimit = Number.isFinite(Number(limit)) ? Math.min(Math.max(Number(limit), 1), 200) : 25;
  const result = await query(
    'SELECT * FROM jobs ORDER BY created_at DESC LIMIT $1',
    [safeLimit]
  );
  return result.rows;
}

export async function appendJobEvent(jobId, eventType, eventPayload = {}) {
  const result = await query(
    `INSERT INTO job_events (job_id, event_type, event_payload)
     VALUES ($1, $2, $3::jsonb)
     RETURNING *`,
    [jobId, eventType, JSON.stringify(eventPayload)]
  );
  return result.rows[0] || null;
}

export async function updateJobByRequestId(requestId, updates = {}) {
  const setClauses = [];
  const values = [];

  const pushSet = (column, value, asJson = false) => {
    values.push(asJson ? JSON.stringify(value) : value);
    const idx = values.length;
    setClauses.push(`${column} = ${asJson ? `$${idx}::jsonb` : `$${idx}`}`);
  };

  if (updates.status !== undefined) pushSet('status', updates.status);
  if (updates.approvalStatus !== undefined) pushSet('approval_status', updates.approvalStatus);
  if (updates.autoApproved !== undefined) pushSet('auto_approved', updates.autoApproved);
  if (updates.payload !== undefined) pushSet('payload', updates.payload, true);
  if (updates.result !== undefined) pushSet('result', updates.result, true);
  if (updates.errorMessage !== undefined) pushSet('error_message', updates.errorMessage);
  if (updates.completedAt !== undefined) pushSet('completed_at', updates.completedAt);

  if (!setClauses.length) {
    return getJobByRequestId(requestId);
  }

  values.push(requestId);
  const requestIdIndex = values.length;

  const result = await query(
    `UPDATE jobs
     SET ${setClauses.join(', ')}, updated_at = now()
     WHERE request_id = $${requestIdIndex}
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
}
