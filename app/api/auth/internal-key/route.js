import { NextResponse } from 'next/server';
import { bootstrapDatabase } from '@/src/lib/db/bootstrap';
import { createInternalApiKey, ensureLocalAdminUser } from '@/src/lib/db/apiKeys';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    if (body.auto_init !== false) {
      await bootstrapDatabase();
    }

    const user = await ensureLocalAdminUser();
    const key = await createInternalApiKey({
      userId: user.id,
      keyName: body.key_name || 'Local Admin Key',
    });

    return NextResponse.json({
      ok: true,
      user,
      api_key: key.apiKey,
      key_prefix: key.record?.key_prefix || null,
      key_name: key.record?.key_name || null,
      created_at: key.record?.created_at || null,
      note: 'Store this key securely. It is only returned once.',
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
