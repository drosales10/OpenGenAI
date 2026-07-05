import { NextResponse } from 'next/server';
import { requireInternalApiKey } from '@/src/lib/server/internalAuth';
import { createInternalApiKey, listInternalApiKeysByUser, deactivateInternalApiKey } from '@/src/lib/db/apiKeys';
import { recordAdminAudit } from '@/src/lib/db/adminAudit';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const auth = await requireInternalApiKey(request);
    if (!auth.ok) return auth.response;

    const userRole = auth.auth?.role || 'user';
    const userId = Number(auth.auth?.user_id || 0);
    const { searchParams } = new URL(request.url);
    const requestedUserId = Number(searchParams.get('user_id') || userId);

    if (!Number.isInteger(requestedUserId) || requestedUserId <= 0) {
      return NextResponse.json({ ok: false, error: 'Invalid user_id' }, { status: 400 });
    }

    if (userRole !== 'admin' && requestedUserId !== userId) {
      return NextResponse.json({ ok: false, error: 'Admin role required' }, { status: 403 });
    }

    const keys = await listInternalApiKeysByUser(requestedUserId);
    return NextResponse.json({ ok: true, keys, user_id: requestedUserId });
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

    if (auth.auth?.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Admin role required' }, { status: 403 });
    }

    const body = await request.json();
    const userId = Number(body.user_id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ ok: false, error: 'Invalid user_id' }, { status: 400 });
    }

    const created = await createInternalApiKey({
      userId,
      keyName: body.key_name || 'Generated Key',
    });

    await recordAdminAudit({
      actorUserId: auth.auth?.user_id,
      actorEmail: auth.auth?.email,
      action: 'api_key.create',
      targetUserId: userId,
      targetType: 'api_key',
      targetId: created.record?.id ? String(created.record.id) : null,
      details: {
        key_name: body.key_name || 'Generated Key',
        key_prefix: created.record?.key_prefix || null,
      },
    });

    return NextResponse.json({
      ok: true,
      api_key: created.apiKey,
      key_prefix: created.record?.key_prefix || null,
      key_record: created.record || null,
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

export async function PATCH(request) {
  try {
    const auth = await requireInternalApiKey(request);
    if (!auth.ok) return auth.response;

    if (auth.auth?.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Admin role required' }, { status: 403 });
    }

    const body = await request.json();
    const updated = await deactivateInternalApiKey({
      keyId: body.key_id,
      userId: body.user_id,
    });

    if (!updated) {
      return NextResponse.json({ ok: false, error: 'Key not found' }, { status: 404 });
    }

    await recordAdminAudit({
      actorUserId: auth.auth?.user_id,
      actorEmail: auth.auth?.email,
      action: 'api_key.deactivate',
      targetUserId: updated.user_id,
      targetType: 'api_key',
      targetId: String(updated.id),
      details: {
        key_prefix: updated.key_prefix,
        key_name: updated.key_name,
      },
    });

    return NextResponse.json({ ok: true, key: updated });
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
