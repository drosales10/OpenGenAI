import { NextResponse } from 'next/server';
import { comfyuiT2iModels, comfyuiT2vModels, comfyuiAudioModels } from '@/packages/studio/src/comfyuiModels';

export async function GET() {
  return NextResponse.json({
    ok: true,
    models: {
      t2i: comfyuiT2iModels,
      t2v: comfyuiT2vModels,
      audio: comfyuiAudioModels,
    },
  });
}
