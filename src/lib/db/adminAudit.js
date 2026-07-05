import { query } from '@/src/lib/postgres';

function isMissingTableError(error, tableName) {
  return error?.code === '42P01' && String(error?.message || '').includes(tableName);
}

export async function recordAdminAudit({
  actorUserId,
  actorEmail,
  action,
  targetUserId = null,
  targetType = null,
  targetId = null,
  details = {},
}) {
  try {
    await query(
      `INSERT INTO admin_audit_logs (
        actor_user_id,
        actor_email,
        action,
        target_user_id,
        target_type,
        target_id,
        details
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        actorUserId || null,
        actorEmail || null,
        action,
        targetUserId || null,
        targetType || null,
        targetId || null,
        JSON.stringify(details || {}),
      ]
    );
  } catch (error) {
    if (isMissingTableError(error, 'admin_audit_logs')) return;
    throw error;
  }
}

export async function listAdminAuditLogs({ limit = 50 } = {}) {
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));

  try {
    const result = await query(
      `SELECT
        id,
        actor_user_id,
        actor_email,
        action,
        target_user_id,
        target_type,
        target_id,
        details,
        created_at
      FROM admin_audit_logs
      ORDER BY created_at DESC
      LIMIT $1`,
      [safeLimit]
    );

    return result.rows || [];
  } catch (error) {
    if (isMissingTableError(error, 'admin_audit_logs')) return [];
    throw error;
  }
}
