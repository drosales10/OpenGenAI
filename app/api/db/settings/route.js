import { NextResponse } from 'next/server';
import { getSetting, upsertSetting } from '@/src/lib/db/settings';
import { requireInternalApiKey } from '@/src/lib/server/internalAuth';
import { getQuotaPolicy, upsertQuotaPolicy } from '@/src/lib/db/quotas';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const auth = await requireInternalApiKey(request);
    if (!auth.ok) return auth.response;

    const autoApprove = await getSetting('auto_approve_jobs');
    const defaultStatus = await getSetting('default_job_status');
    const quotaPolicy = await getQuotaPolicy();

    return NextResponse.json({
      ok: true,
      auto_approve_jobs: autoApprove?.setting_value || { enabled: true },
      default_job_status: defaultStatus?.setting_value || { value: 'approved' },
      provider_quota_policy: quotaPolicy,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const auth = await requireInternalApiKey(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const updates = [];

    if (body.auto_approve_jobs !== undefined) {
      updates.push(
        upsertSetting('auto_approve_jobs', {
          enabled: Boolean(body.auto_approve_jobs),
        })
      );
    }

    if (body.default_job_status !== undefined) {
      updates.push(
        upsertSetting('default_job_status', {
          value: String(body.default_job_status),
        })
      );
    }

    if (body.provider_quota_policy !== undefined) {
      updates.push(upsertQuotaPolicy(body.provider_quota_policy));
    }

    const results = await Promise.all(updates);

    return NextResponse.json({
      ok: true,
      updated: results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
