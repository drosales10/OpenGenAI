import { NextResponse } from 'next/server';
import { requireInternalApiKey } from '@/src/lib/server/internalAuth';
import { getUsageSnapshot } from '@/src/lib/db/quotas';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const auth = await requireInternalApiKey(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const routeGroup = searchParams.get('route_group') || null;
    const provider = searchParams.get('provider') || 'muapi';
    const period = searchParams.get('period') === 'minute' ? 'minute' : 'day';
    const projectId = searchParams.get('project_id') || searchParams.get('projectId') || null;

    const globalUsage = await getUsageSnapshot({ provider, routeGroup, period });
    const userId = auth.auth?.user_id || null;
    const userUsage = userId ? await getUsageSnapshot({ provider, routeGroup, userId, period }) : null;
    const projectUsage = projectId ? await getUsageSnapshot({ provider, routeGroup, projectId, period }) : null;

    return NextResponse.json({
      ok: true,
      provider,
      route_group: routeGroup,
      period,
      project_id: projectId,
      global: globalUsage,
      user: userUsage,
      project: projectUsage,
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
