import { NextResponse } from 'next/server';
import { routeGeneration, getGenerationRoutingInfo } from '@/src/lib/providers/generationRouter';

export const runtime = 'nodejs';
export const maxDuration = 600;

function getLegacyApiKey(request) {
  return (
    request.headers.get('x-api-key')
    || request.cookies.get('muapi_key')?.value
    || ''
  );
}

export async function GET(request, { params }) {
  try {
    const slug = await params;
    const endpoint = (slug.path || []).join('/');
    const info = await getGenerationRoutingInfo(endpoint);
    return NextResponse.json({ ok: true, ...info });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  let endpoint = '';
  try {
    const slug = await params;
    endpoint = (slug.path || []).join('/');
    let payload;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: 'La petición es demasiado grande o inválida. Vuelve a subir la imagen (se comprimirá automáticamente).',
        },
        { status: 413 }
      );
    }
    const legacyApiKey = getLegacyApiKey(request);

    const result = await routeGeneration(endpoint, payload, { legacyApiKey });

    return NextResponse.json({
      ok: true,
      ...result,
      outputs: result.url ? [result.url] : result.outputs,
    });
  } catch (error) {
    const message = error.message || 'Generation failed';
    let status = 502;
    if (
      message.includes('No hay clave API')
      || message.includes('no configurada')
      || message.includes('no configurado')
    ) {
      status = 412;
    } else if (
      message.includes('Google AI')
      || message.includes('Google')
      || message.includes('Gemini/')
      || message.includes('Gemini')
      || message.includes('Imagen')
      || message.includes('Interactions')
      || message.includes('Veo')
      || message.includes('OpenAI')
      || message.includes('Sora')
      || message.includes('bloqueó')
      || message.includes('Se requiere un prompt')
      || message.includes('bloqueó el video')
      || message.includes('políticas de contenido')
      || message.includes('Configura tu clave')
      || message.includes('API key')
      || message.includes('clave de Google')
      || message.includes('archivo temporal')
      || message.includes('imagen de referencia')
      || message.includes('imagen subida solo funciona')
      || message.includes('FAL_KEY')
      || message.includes('fal.ai')
      || /\(4\d\d\)/.test(message)
    ) {
      status = 400;
    } else if (message.includes('timed out') || message.includes('tiempo de espera')) {
      status = 504;
    }

    console.error('[generate]', endpoint, message);

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
