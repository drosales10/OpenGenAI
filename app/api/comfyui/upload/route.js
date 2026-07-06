import { NextResponse } from 'next/server';
import { resolveComfyuiHostFromEnv, uploadComfyuiImage } from '@/src/lib/providers/comfyuiShared';

export async function POST(request) {
  const host = resolveComfyuiHostFromEnv();
  if (!host) {
    return NextResponse.json({ ok: false, error: 'COMFYUI_URL no configurado' }, { status: 503 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') || formData.get('image');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ ok: false, error: 'Archivo requerido' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name || 'upload.png';
    const result = await uploadComfyuiImage(host, buffer, filename);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
