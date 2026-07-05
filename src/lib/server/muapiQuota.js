import { NextResponse } from 'next/server';
import { getQuotaPolicy, getUsageSnapshot } from '@/src/lib/db/quotas';

function routeLimit(policy, key, fallback) {
  const override = policy.route_overrides?.[key];
  if (override === null || override === undefined || override === '') {
    return fallback;
  }

  const num = Number(override);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Math.floor(num);
}

function quotaExceededResponse({ message, code, routeGroup, limit, used, window, scope }) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      code,
      route_group: routeGroup,
      scope,
      window,
      limit,
      used,
    },
    { status: 429 }
  );
}

export async function enforceMuapiQuota({ routeGroup, userId, projectId }) {
  const policy = await getQuotaPolicy();
  if (!policy.enabled) {
    return { ok: true, policy, usage: null };
  }

  const dailyGlobalLimit = routeLimit(policy, `${routeGroup}:daily_global`, policy.daily_global_limit);
  const dailyUserLimit = routeLimit(policy, `${routeGroup}:daily_user`, policy.daily_user_limit);
  const dailyProjectLimit = routeLimit(policy, `${routeGroup}:daily_project`, policy.daily_project_limit);

  const minuteGlobalLimit = routeLimit(policy, `${routeGroup}:minute_global`, policy.minute_global_limit);
  const minuteUserLimit = routeLimit(policy, `${routeGroup}:minute_user`, policy.minute_user_limit);
  const minuteProjectLimit = routeLimit(policy, `${routeGroup}:minute_project`, policy.minute_project_limit);

  const dailyGlobalUsage = await getUsageSnapshot({ provider: 'muapi', routeGroup, period: 'day' });
  if (dailyGlobalLimit > 0 && Number(dailyGlobalUsage.accounted_requests || 0) >= dailyGlobalLimit) {
    return {
      ok: false,
      response: quotaExceededResponse({
        message: `Global daily quota reached for ${routeGroup}`,
        code: 'quota_daily_global_exceeded',
        routeGroup,
        limit: dailyGlobalLimit,
        used: Number(dailyGlobalUsage.accounted_requests || 0),
        window: 'day',
        scope: 'global',
      }),
      usage: { dailyGlobal: dailyGlobalUsage },
      policy,
    };
  }

  const minuteGlobalUsage = await getUsageSnapshot({ provider: 'muapi', routeGroup, period: 'minute' });
  if (minuteGlobalLimit > 0 && Number(minuteGlobalUsage.accounted_requests || 0) >= minuteGlobalLimit) {
    return {
      ok: false,
      response: quotaExceededResponse({
        message: `Global per-minute quota reached for ${routeGroup}`,
        code: 'quota_minute_global_exceeded',
        routeGroup,
        limit: minuteGlobalLimit,
        used: Number(minuteGlobalUsage.accounted_requests || 0),
        window: 'minute',
        scope: 'global',
      }),
      usage: { minuteGlobal: minuteGlobalUsage },
      policy,
    };
  }

  let dailyUserUsage = null;
  let minuteUserUsage = null;
  if (userId) {
    dailyUserUsage = await getUsageSnapshot({ provider: 'muapi', routeGroup, userId, period: 'day' });
    if (dailyUserLimit > 0 && Number(dailyUserUsage.accounted_requests || 0) >= dailyUserLimit) {
      return {
        ok: false,
        response: quotaExceededResponse({
          message: `Daily user quota reached for ${routeGroup}`,
          code: 'quota_daily_user_exceeded',
          routeGroup,
          limit: dailyUserLimit,
          used: Number(dailyUserUsage.accounted_requests || 0),
          window: 'day',
          scope: 'user',
        }),
        usage: { dailyGlobal: dailyGlobalUsage, dailyUser: dailyUserUsage },
        policy,
      };
    }

    minuteUserUsage = await getUsageSnapshot({ provider: 'muapi', routeGroup, userId, period: 'minute' });
    if (minuteUserLimit > 0 && Number(minuteUserUsage.accounted_requests || 0) >= minuteUserLimit) {
      return {
        ok: false,
        response: quotaExceededResponse({
          message: `Per-minute user quota reached for ${routeGroup}`,
          code: 'quota_minute_user_exceeded',
          routeGroup,
          limit: minuteUserLimit,
          used: Number(minuteUserUsage.accounted_requests || 0),
          window: 'minute',
          scope: 'user',
        }),
        usage: { minuteGlobal: minuteGlobalUsage, minuteUser: minuteUserUsage },
        policy,
      };
    }
  }

  let dailyProjectUsage = null;
  let minuteProjectUsage = null;
  if (projectId) {
    dailyProjectUsage = await getUsageSnapshot({ provider: 'muapi', routeGroup, projectId, period: 'day' });
    if (dailyProjectLimit > 0 && Number(dailyProjectUsage.accounted_requests || 0) >= dailyProjectLimit) {
      return {
        ok: false,
        response: quotaExceededResponse({
          message: `Daily project quota reached for ${routeGroup}`,
          code: 'quota_daily_project_exceeded',
          routeGroup,
          limit: dailyProjectLimit,
          used: Number(dailyProjectUsage.accounted_requests || 0),
          window: 'day',
          scope: 'project',
        }),
        usage: { dailyGlobal: dailyGlobalUsage, dailyProject: dailyProjectUsage },
        policy,
      };
    }

    minuteProjectUsage = await getUsageSnapshot({ provider: 'muapi', routeGroup, projectId, period: 'minute' });
    if (minuteProjectLimit > 0 && Number(minuteProjectUsage.accounted_requests || 0) >= minuteProjectLimit) {
      return {
        ok: false,
        response: quotaExceededResponse({
          message: `Per-minute project quota reached for ${routeGroup}`,
          code: 'quota_minute_project_exceeded',
          routeGroup,
          limit: minuteProjectLimit,
          used: Number(minuteProjectUsage.accounted_requests || 0),
          window: 'minute',
          scope: 'project',
        }),
        usage: { minuteGlobal: minuteGlobalUsage, minuteProject: minuteProjectUsage },
        policy,
      };
    }
  }

  return {
    ok: true,
    policy,
    usage: {
      dailyGlobal: dailyGlobalUsage,
      minuteGlobal: minuteGlobalUsage,
      dailyUser: dailyUserUsage,
      minuteUser: minuteUserUsage,
      dailyProject: dailyProjectUsage,
      minuteProject: minuteProjectUsage,
    },
  };
}
