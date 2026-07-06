import { NextResponse } from 'next/server';
import { resolveCredentialsForModel } from '@/src/lib/db/modelCredentials';
import { OPENAI_API_BASE, openaiHeaders } from '@/src/lib/providers/openaiShared';
import { resolveWan2gpHostFromEnv, normalizeWan2gpUrl } from '@/src/lib/providers/wan2gpShared';
import { resolveComfyuiHostFromEnv, normalizeComfyuiHost } from '@/src/lib/providers/comfyuiShared';
import { getProviderCredentialsForApi } from '@/src/lib/db/providerCredentials';

export const runtime = 'nodejs';

function isAllowedGoogleMediaUri(uri) {
  try {
    const parsed = new URL(uri);
    return (
      parsed.protocol === 'https:'
      && (
        parsed.hostname.endsWith('googleapis.com')
        || parsed.hostname.endsWith('google.com')
      )
    );
  } catch {
    return false;
  }
}

async function streamGoogleVideo(uri, apiKey) {
  const videoResponse = await fetch(uri, {
    headers: { 'x-goog-api-key': apiKey },
    redirect: 'follow',
  });

  if (!videoResponse.ok) {
    const errText = await videoResponse.text();
    throw new Error(`Descarga de video Google falló (${videoResponse.status}): ${errText.slice(0, 120)}`);
  }

  const buffer = await videoResponse.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': videoResponse.headers.get('content-type') || 'video/mp4',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

async function streamOpenAIVideo(videoId, apiKey) {
  const videoResponse = await fetch(`${OPENAI_API_BASE}/videos/${videoId}/content`, {
    headers: openaiHeaders(apiKey, null),
    redirect: 'follow',
  });

  if (!videoResponse.ok) {
    const errText = await videoResponse.text();
    throw new Error(`Descarga de video OpenAI falló (${videoResponse.status}): ${errText.slice(0, 120)}`);
  }

  const buffer = await videoResponse.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': videoResponse.headers.get('content-type') || 'video/mp4',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

function isAllowedWan2gpUri(uri, allowedBase) {
  try {
    const u = new URL(uri);
    const b = new URL(normalizeWan2gpUrl(allowedBase));
    return u.hostname === b.hostname && String(u.port || (u.protocol === 'https:' ? '443' : '80'))
      === String(b.port || (b.protocol === 'https:' ? '443' : '80'));
  } catch {
    return false;
  }
}

function isAllowedComfyuiUri(uri, allowedBase) {
  try {
    const u = new URL(uri);
    const b = new URL(normalizeComfyuiHost(allowedBase));
    return u.hostname === b.hostname && String(u.port || (u.protocol === 'https:' ? '443' : '80'))
      === String(b.port || (b.protocol === 'https:' ? '443' : '80'));
  } catch {
    return false;
  }
}

async function streamRemoteMedia(uri) {
  const mediaResponse = await fetch(uri, { redirect: 'follow' });
  if (!mediaResponse.ok) {
    const errText = await mediaResponse.text();
    throw new Error(`Descarga media falló (${mediaResponse.status}): ${errText.slice(0, 120)}`);
  }
  const buffer = await mediaResponse.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': mediaResponse.headers.get('content-type') || 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

async function streamWan2gpMedia(uri) {
  return streamRemoteMedia(uri);
}

export async function GET(request) {
  const provider = request.nextUrl.searchParams.get('provider') || 'google';
  const endpoint = request.nextUrl.searchParams.get('endpoint');
  const uri = request.nextUrl.searchParams.get('uri');
  const videoId = request.nextUrl.searchParams.get('video_id');

  if (provider === 'comfyui') {
    if (!uri) {
      return NextResponse.json({ ok: false, error: 'Parámetro uri requerido' }, { status: 400 });
    }
    try {
      const global = await getProviderCredentialsForApi('_global', 'comfyui');
      const base = global?.base_url || resolveComfyuiHostFromEnv();
      if (!isAllowedComfyuiUri(uri, base)) {
        return NextResponse.json({ ok: false, error: 'URI ComfyUI no permitida' }, { status: 403 });
      }
      return await streamRemoteMedia(uri);
    } catch (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
  }

  if (provider === 'wan2gp') {
    if (!uri) {
      return NextResponse.json({ ok: false, error: 'Parámetro uri requerido' }, { status: 400 });
    }
    try {
      const global = await getProviderCredentialsForApi('_global', 'wan2gp');
      const base = global?.base_url || resolveWan2gpHostFromEnv();
      if (!isAllowedWan2gpUri(uri, base)) {
        return NextResponse.json({ ok: false, error: 'URI Wan2GP no permitida' }, { status: 403 });
      }
      return await streamWan2gpMedia(uri);
    } catch (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
  }

  if (!endpoint) {
    return NextResponse.json({ ok: false, error: 'Parámetro endpoint requerido' }, { status: 400 });
  }

  if (provider === 'openai') {
    if (!videoId) {
      return NextResponse.json({ ok: false, error: 'Parámetro video_id requerido para OpenAI' }, { status: 400 });
    }
  } else if (!uri) {
    return NextResponse.json({ ok: false, error: 'Parámetro uri requerido' }, { status: 400 });
  }

  if (provider !== 'openai' && !isAllowedGoogleMediaUri(uri)) {
    return NextResponse.json({ ok: false, error: 'URI de media no permitida' }, { status: 403 });
  }

  try {
    const credentials = await resolveCredentialsForModel(endpoint);
    if (!credentials?.apiKey) {
      return NextResponse.json(
        { ok: false, error: 'No hay clave API configurada para este modelo' },
        { status: 412 }
      );
    }

    if (provider === 'openai') {
      return await streamOpenAIVideo(videoId, credentials.apiKey);
    }

    return await streamGoogleVideo(uri, credentials.apiKey);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message || 'Error al obtener media' }, { status: 500 });
  }
}
