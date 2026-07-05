import { NextResponse } from 'next/server';
import { requireInternalApiKey } from '@/src/lib/server/internalAuth';
import { recordAdminAudit } from '@/src/lib/db/adminAudit';
import {
  listProviderCredentials,
  upsertProviderCredentials,
  getModuleCredentialsStatus,
} from '@/src/lib/db/providerCredentials';
import { getModuleById, getProviderDefinition } from '@/src/lib/providerCatalog';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const auth = await requireInternalApiKey(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('module_id');

    if (moduleId) {
      const status = await getModuleCredentialsStatus(moduleId);
      return NextResponse.json({ ok: true, ...status });
    }

    const credentials = await listProviderCredentials();
    return NextResponse.json({ ok: true, credentials });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const auth = await requireInternalApiKey(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const moduleId = String(body.module_id || '').trim();
    const providerId = String(body.provider_id || '').trim();
    const credentials = body.credentials || {};
    const isActive = body.is_active !== false;

    if (!moduleId || !providerId) {
      return NextResponse.json(
        { ok: false, error: 'module_id and provider_id are required' },
        { status: 400 }
      );
    }

    const mod = getModuleById(moduleId);
    if (!mod) {
      return NextResponse.json(
        { ok: false, error: `Unknown module: ${moduleId}` },
        { status: 400 }
      );
    }

    if (!mod.providers.includes(providerId)) {
      return NextResponse.json(
        { ok: false, error: `Provider ${providerId} is not allowed for module ${moduleId}` },
        { status: 400 }
      );
    }

    const providerDef = getProviderDefinition(providerId);
    if (providerDef?.readOnly) {
      return NextResponse.json(
        { ok: false, error: `Provider ${providerId} is read-only` },
        { status: 400 }
      );
    }

    const result = await upsertProviderCredentials({
      moduleId,
      providerId,
      credentials,
      isActive,
    });

    await recordAdminAudit({
      actorUserId: auth.auth?.user_id,
      actorEmail: auth.auth?.email,
      action: 'provider_credentials.upsert',
      targetType: 'provider_credentials',
      targetId: `${moduleId}:${providerId}`,
      details: {
        module_id: moduleId,
        provider_id: providerId,
        configured: result.configured,
      },
    });

    return NextResponse.json({ ok: true, credential: result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
