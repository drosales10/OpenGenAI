import { NextResponse } from 'next/server';
import { requireInternalApiKey } from '@/src/lib/server/internalAuth';
import { recordAdminAudit } from '@/src/lib/db/adminAudit';
import {
  deleteProviderCredentials,
  getModuleCredentialsStatus,
} from '@/src/lib/db/providerCredentials';
import { getModuleById } from '@/src/lib/providerCatalog';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  try {
    const auth = await requireInternalApiKey(request);
    if (!auth.ok) return auth.response;

    const { moduleId } = await params;
    const mod = getModuleById(moduleId);
    if (!mod) {
      return NextResponse.json(
        { ok: false, error: `Unknown module: ${moduleId}` },
        { status: 404 }
      );
    }

    const status = await getModuleCredentialsStatus(moduleId);
    return NextResponse.json({ ok: true, ...status });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requireInternalApiKey(request);
    if (!auth.ok) return auth.response;

    const { moduleId } = await params;
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('provider_id');

    if (!providerId) {
      return NextResponse.json(
        { ok: false, error: 'provider_id query param is required' },
        { status: 400 }
      );
    }

    const deleted = await deleteProviderCredentials(moduleId, providerId);
    if (!deleted) {
      return NextResponse.json(
        { ok: false, error: 'Credential not found' },
        { status: 404 }
      );
    }

    await recordAdminAudit({
      actorUserId: auth.auth?.user_id,
      actorEmail: auth.auth?.email,
      action: 'provider_credentials.delete',
      targetType: 'provider_credentials',
      targetId: `${moduleId}:${providerId}`,
      details: { module_id: moduleId, provider_id: providerId },
    });

    return NextResponse.json({ ok: true, deleted: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
