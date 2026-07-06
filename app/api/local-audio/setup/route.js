import { NextResponse } from 'next/server';
import { LOCAL_AUDIO_PULL_HINTS } from '@/src/lib/localAudioModels';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    ok: true,
    hints: LOCAL_AUDIO_PULL_HINTS,
    notes: [
      'Ejecuta: pip install audiocraft fastapi uvicorn torch',
      'Para XTTS (Lip Sync): pip install TTS',
      'Luego: python scripts/local_audio_server.py',
      'Define LOCAL_AUDIO_HOST=http://127.0.0.1:8765 en .env',
    ],
  });
}
