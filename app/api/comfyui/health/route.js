import { NextResponse } from 'next/server';
import { resolveComfyuiHostFromEnv, normalizeComfyuiHost } from '@/src/lib/providers/comfyuiShared';

export async function GET() {
  const host = resolveComfyuiHostFromEnv();
  if (!host) {
    return NextResponse.json({
      ok: false,
      configured: false,
      error: 'COMFYUI_URL no configurado',
    });
  }

  try {
    const res = await fetch(`${normalizeComfyuiHost(host)}/system_stats`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        configured: true,
        host,
        error: `ComfyUI respondió ${res.status}`,
      });
    }
    const stats = await res.json();
    return NextResponse.json({
      ok: true,
      configured: true,
      host,
      stats,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      configured: true,
      host,
      error: error.message,
    });
  }
}
