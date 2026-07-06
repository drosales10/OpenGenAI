/**
 * Modelos de audio local (MusicGen / ACE-Step).
 * Requiere servidor HTTP compatible — ver scripts/local_audio_server.py
 */

export const LOCAL_AUDIO_PULL_HINTS = [
  {
    id: 'musicgen-medium',
    engine: 'musicgen',
    model: 'medium',
    hint: 'pip install audiocraft fastapi uvicorn && python scripts/local_audio_server.py',
    size: '~1.5 GB VRAM (medium)',
    license: 'MIT (MusicGen weights: CC-BY-NC 4.0)',
  },
  {
    id: 'ace-step',
    engine: 'ace-step',
    model: 'ace-step',
    hint: 'git clone ACE-Step + servidor en LOCAL_AUDIO_HOST (ver README del repo)',
    size: 'variable',
    license: 'Apache 2.0',
  },
  {
    id: 'xtts-v2',
    engine: 'xtts',
    model: 'xtts_v2',
    hint: 'pip install TTS fastapi uvicorn && python scripts/local_audio_server.py (usa Lip Sync → XTTS)',
    size: '~2 GB VRAM',
    license: 'CPML (Coqui TTS)',
  },
];

function localAudioModel(id, name, engine, model, extra = {}) {
  return {
    id,
    name,
    endpoint: id,
    provider: 'local_audio',
    family: engine,
    engine,
    localAudioModel: model,
    description: extra.description || '',
    tags: ['local', 'open-source', engine],
    inputs: {
      prompt: {
        type: 'string',
        title: 'Prompt',
        name: 'prompt',
        description: 'Descripción del audio o letra/estilo musical.',
      },
      style: {
        type: 'string',
        title: 'Style',
        name: 'style',
        description: 'Estilo musical (opcional).',
        placeholder: 'Jazz, Electronic, Classical…',
      },
      duration: {
        type: 'int',
        title: 'Duration',
        name: 'duration',
        description: 'Duración en segundos.',
        default: 30,
        minValue: 5,
        maxValue: 120,
        step: 1,
      },
    },
    ...extra,
  };
}

export const localAudioModels = [
  localAudioModel(
    'local-musicgen-small',
    'MusicGen Small (local)',
    'musicgen',
    'small',
    { description: 'Música instrumental ligera. ~300M params. Ideal para pruebas.' }
  ),
  localAudioModel(
    'local-musicgen-medium',
    'MusicGen Medium (local)',
    'musicgen',
    'medium',
    { description: 'Balance calidad/velocidad. Recomendado.', featured: true }
  ),
  localAudioModel(
    'local-musicgen-large',
    'MusicGen Large (local)',
    'musicgen',
    'large',
    { description: 'Mayor calidad. Requiere más VRAM.' }
  ),
  localAudioModel(
    'local-ace-step',
    'ACE-Step (local)',
    'ace-step',
    'ace-step',
    { description: 'Música con estructura de canción. Servidor ACE-Step propio.' }
  ),
];

export function getLocalAudioModelById(id) {
  return localAudioModels.find((m) => m.id === id) || null;
}

export function isLocalAudioModelId(id) {
  return String(id || '').startsWith('local-') && Boolean(getLocalAudioModelById(id));
}
