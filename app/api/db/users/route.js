import { NextResponse } from 'next/server';
import { requireInternalApiKey } from '@/src/lib/server/internalAuth';
import { listUsers, upsertUser, updateUser } from '@/src/lib/db/users';
import { recordAdminAudit } from '@/src/lib/db/adminAudit';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const auth = await requireInternalApiKey(request);
    if (!auth.ok) return auth.response;

    const users = await listUsers();
    return NextResponse.json({
      ok: true,
      users,
      current_user_id: auth.auth?.user_id || null,
      current_user_role: auth.auth?.role || null,
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

    if (auth.auth?.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Admin role required' }, { status: 403 });
    }

    const body = await request.json();
    const user = await upsertUser({
      email: body.email,
      displayName: body.display_name,
      role: body.role,
    });

    await recordAdminAudit({
      actorUserId: auth.auth?.user_id,
      actorEmail: auth.auth?.email,
      action: 'user.upsert',
      targetUserId: user?.id || null,
      targetType: 'user',
      targetId: user?.id ? String(user.id) : null,
      details: {
        email: body.email || null,
        display_name: body.display_name || null,
        role: body.role || null,
      },
    });

    return NextResponse.json({ ok: true, user });
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
    const user = await updateUser({
      id: body.id,
      displayName: body.display_name,
      role: body.role,
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
    }

    await recordAdminAudit({
      actorUserId: auth.auth?.user_id,
      actorEmail: auth.auth?.email,
      action: 'user.update',
      targetUserId: user.id,
      targetType: 'user',
      targetId: String(user.id),
      details: {
        display_name: body.display_name,
        role: body.role,
      },
    });

    return NextResponse.json({ ok: true, user });
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
