import { query } from '@/src/lib/postgres';
import { getSetting, upsertSetting } from '@/src/lib/db/settings';

const QUOTA_POLICY_KEY = 'provider_quota_policy';

export const DEFAULT_QUOTA_POLICY = {
  enabled: false,
  daily_global_limit: 5000,
  daily_user_limit: 500,
  daily_project_limit: 1200,
  minute_global_limit: 300,
  minute_user_limit: 60,
  minute_project_limit: 120,
  route_overrides: {},
};

function isMissingTableError(error, tableName) {
  return error?.code === '42P01' && String(error?.message || '').includes(tableName);
}

function sanitizeLimit(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Math.floor(num);
}

export function normalizeQuotaPolicy(input = {}) {
  const merged = {
    ...DEFAULT_QUOTA_POLICY,
    ...(input || {}),
  };

  return {
    enabled: Boolean(merged.enabled),
    daily_global_limit: sanitizeLimit(merged.daily_global_limit, DEFAULT_QUOTA_POLICY.daily_global_limit),
    daily_user_limit: sanitizeLimit(merged.daily_user_limit, DEFAULT_QUOTA_POLICY.daily_user_limit),
    daily_project_limit: sanitizeLimit(merged.daily_project_limit, DEFAULT_QUOTA_POLICY.daily_project_limit),
    minute_global_limit: sanitizeLimit(merged.minute_global_limit, DEFAULT_QUOTA_POLICY.minute_global_limit),
    minute_user_limit: sanitizeLimit(merged.minute_user_limit, DEFAULT_QUOTA_POLICY.minute_user_limit),
    minute_project_limit: sanitizeLimit(merged.minute_project_limit, DEFAULT_QUOTA_POLICY.minute_project_limit),
    route_overrides: merged.route_overrides && typeof merged.route_overrides === 'object' ? merged.route_overrides : {},
  };
}

export async function getQuotaPolicy() {
  try {
    const setting = await getSetting(QUOTA_POLICY_KEY);
    if (!setting?.setting_value) {
      return { ...DEFAULT_QUOTA_POLICY };
    }

    return normalizeQuotaPolicy(setting.setting_value);
  } catch (error) {
    // Do not block provider proxy routes if DB schema is not ready yet.
    if (isMissingTableError(error, 'system_settings')) {
      return { ...DEFAULT_QUOTA_POLICY, enabled: false };
    }
    throw error;
  }
}

export async function upsertQuotaPolicy(policy) {
  const normalized = normalizeQuotaPolicy(policy);
  await upsertSetting(QUOTA_POLICY_KEY, normalized);
  return normalized;
}

export async function getUsageSnapshot({ provider = 'muapi', routeGroup = null, userId = null, projectId = null, period = 'day' } = {}) {
  const timeFilter = period === 'minute'
    ? "created_at >= now() - interval '1 minute'"
    : "created_at >= date_trunc('day', now())";

  const filters = ['provider = $1', timeFilter];
  const values = [provider];

  if (routeGroup) {
    values.push(routeGroup);
    filters.push(`route_group = $${values.length}`);
  }

  if (userId !== null && userId !== undefined) {
    values.push(userId);
    filters.push(`user_id = $${values.length}`);
  }

  if (projectId !== null && projectId !== undefined && String(projectId).trim() !== '') {
    values.push(String(projectId));
    filters.push(`project_id = $${values.length}`);
  }

  values.push(429);
  const blockedIndex = values.length;

  const sql = `
    SELECT
      COUNT(*)::int AS total_requests,
      COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 500)::int AS accounted_requests,
      COUNT(*) FILTER (WHERE status_code = $${blockedIndex})::int AS blocked_requests
    FROM provider_request_logs
    WHERE ${filters.join(' AND ')}
  `;

  try {
    const result = await query(sql, values);
    return result.rows[0] || { total_requests: 0, accounted_requests: 0, blocked_requests: 0 };
  } catch (error) {
    if (isMissingTableError(error, 'provider_request_logs')) {
      return { total_requests: 0, accounted_requests: 0, blocked_requests: 0 };
    }
    throw error;
  }
}
