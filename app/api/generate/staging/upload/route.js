import { NextResponse } from 'next/server';
import { stageMediaFile } from '@/src/lib/server/mediaStaging';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const form = await request.formData();
    const file = form.get('file') || form.get('image');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ ok: false, error: 'Archivo requerido' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!buffer.length) {
      return NextResponse.json({ ok: false, error: 'Archivo vacío' }, { status: 400 });
    }
    if (buffer.length > 15 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: 'Imagen demasiado grande (máx. 15 MB)' }, { status: 400 });
    }

    const staged = await stageMediaFile(buffer, file.type || 'application/octet-stream');
    return NextResponse.json({
      ok: true,
      url: staged.url,
      id: staged.id,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
