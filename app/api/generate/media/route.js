import { NextResponse } from 'next/server';
import { resolveCredentialsForModel } from '@/src/lib/db/modelCredentials';

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

export async function GET(request) {
  const uri = request.nextUrl.searchParams.get('uri');
  const endpoint = request.nextUrl.searchParams.get('endpoint');

  if (!uri || !endpoint) {
    return NextResponse.json({ ok: false, error: 'Parámetros uri y endpoint requeridos' }, { status: 400 });
  }

  if (!isAllowedGoogleMediaUri(uri)) {
    return NextResponse.json({ ok: false, error: 'URI de media no permitida' }, { status: 403 });
  }

  try {
    const credentials = await resolveCredentialsForModel(endpoint);
    if (!credentials?.apiKey) {
      return NextResponse.json(
        { ok: false, error: 'No hay clave Google configurada para este modelo' },
        { status: 412 }
      );
    }

    const videoResponse = await fetch(uri, {
      headers: { 'x-goog-api-key': credentials.apiKey },
      redirect: 'follow',
    });

    if (!videoResponse.ok) {
      const errText = await videoResponse.text();
      return NextResponse.json(
        { ok: false, error: `Descarga de video falló (${videoResponse.status}): ${errText.slice(0, 120)}` },
        { status: 502 }
      );
    }

    const buffer = await videoResponse.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': videoResponse.headers.get('content-type') || 'video/mp4',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message || 'Error al obtener media' }, { status: 500 });
  }
}
