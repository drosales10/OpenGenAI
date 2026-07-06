import { NextResponse } from 'next/server';
import { requireInternalApiKey } from '@/src/lib/server/internalAuth';
import { recordAdminAudit } from '@/src/lib/db/adminAudit';
import {
  listModelCredentials,
  upsertModelCredentials,
  deleteModelCredentials,
} from '@/src/lib/db/modelCredentials';
import { buildModelsCatalog } from '@/src/lib/modelRegistry';
import { findModelContext } from '@/src/lib/modelRegistry';
import { resolveOllamaHostFromEnv } from '@/src/lib/providers/ollamaShared';
import { resolveWan2gpHostFromEnv } from '@/src/lib/providers/wan2gpShared';
import { resolveLocalAudioHostFromEnv } from '@/src/lib/providers/localAudioShared';
import { resolveComfyuiHostFromEnv } from '@/src/lib/providers/comfyuiShared';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const auth = await requireInternalApiKey(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('module_id');
    const lang = searchParams.get('lang') || 'es';

    let models = buildModelsCatalog(lang);
    if (moduleId) {
      models = models.filter((m) => m.module_id === moduleId);
    }

    const stored = await listModelCredentials();
    const storedMap = Object.fromEntries(stored.map((s) => [s.model_key, s]));

    const ollamaEnvReady = Boolean(resolveOllamaHostFromEnv());
    const wan2gpEnvReady = Boolean(resolveWan2gpHostFromEnv());
    const localAudioEnvReady = Boolean(resolveLocalAudioHostFromEnv());
    const comfyuiEnvReady = Boolean(resolveComfyuiHostFromEnv());

    return NextResponse.json({
      ok: true,
      models: models.map((m) => ({
        ...m,
        configured: (() => {
          if (m.provider_id === 'ollama') {
            return Boolean(storedMap[m.model_key]?.configured || ollamaEnvReady);
          }
          if (m.provider_id === 'wan2gp') {
            return Boolean(storedMap[m.model_key]?.configured || wan2gpEnvReady);
          }
          if (m.provider_id === 'local_audio') {
            return Boolean(storedMap[m.model_key]?.configured || localAudioEnvReady);
          }
          if (m.provider_id === 'comfyui') {
            return Boolean(storedMap[m.model_key]?.configured || comfyuiEnvReady);
          }
          return Boolean(storedMap[m.model_key]?.configured);
        })(),
        credentials_preview: storedMap[m.model_key]?.credentials_preview || null,
        routing_mode: storedMap[m.model_key]?.routing_mode || 'auto',
      })),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireInternalApiKey(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const modelKey = String(body.model_key || '').trim();
    const credentials = body.credentials || {};
    const routingMode = body.routing_mode || 'auto';

    if (!modelKey) {
      return NextResponse.json({ ok: false, error: 'model_key is required' }, { status: 400 });
    }

    const model = findModelContext(modelKey);
    const result = await upsertModelCredentials({
      modelKey,
      providerId: body.provider_id || model.provider,
      moduleId: body.module_id || model.moduleId,
      credentials,
      routingMode,
    });

    await recordAdminAudit({
      actorUserId: auth.auth?.user_id,
      actorEmail: auth.auth?.email,
      action: 'model_credentials.upsert',
      targetType: 'model_credentials',
      targetId: modelKey,
      details: { model_key: modelKey, provider_id: result.provider_id, configured: result.configured },
    });

    return NextResponse.json({ ok: true, credential: result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const auth = await requireInternalApiKey(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const modelKey = searchParams.get('model_key');
    if (!modelKey) {
      return NextResponse.json({ ok: false, error: 'model_key is required' }, { status: 400 });
    }

    const deleted = await deleteModelCredentials(modelKey);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, deleted: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
