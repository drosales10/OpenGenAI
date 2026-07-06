/**
 * Modelos TTS local (XTTS v2) para Lip Sync Studio.
 * Usa el mismo servidor que MusicGen — scripts/local_audio_server.py
 */

export const XTTS_LANGUAGES = [
  { id: 'es', label: 'Español' },
  { id: 'en', label: 'English' },
  { id: 'fr', label: 'Français' },
  { id: 'de', label: 'Deutsch' },
  { id: 'it', label: 'Italiano' },
  { id: 'pt', label: 'Português' },
  { id: 'pl', label: 'Polski' },
  { id: 'tr', label: 'Türkçe' },
  { id: 'ru', label: 'Русский' },
  { id: 'nl', label: 'Nederlands' },
  { id: 'cs', label: 'Čeština' },
  { id: 'ar', label: 'العربية' },
  { id: 'zh-cn', label: '中文' },
  { id: 'hu', label: 'Magyar' },
  { id: 'ko', label: '한국어' },
  { id: 'ja', label: '日本語' },
];

export const localTtsModels = [
  {
    id: 'local-xtts-v2',
    name: 'XTTS v2 (local)',
    endpoint: 'local-xtts-v2',
    provider: 'local_audio',
    family: 'xtts',
    engine: 'xtts',
    modelKind: 'tts',
    localAudioModel: 'xtts_v2',
    description: 'TTS multilingüe y clonación de voz con audio de referencia (Coqui XTTS v2).',
    tags: ['local', 'open-source', 'tts', 'voice-clone'],
    featured: true,
    inputs: {
      text: {
        type: 'string',
        title: 'Texto',
        name: 'text',
        description: 'Guion a sintetizar en voz.',
      },
      language: {
        type: 'string',
        title: 'Idioma',
        name: 'language',
        enum: XTTS_LANGUAGES.map((l) => l.id),
        default: 'es',
      },
      speaker_wav: {
        type: 'file',
        title: 'Voz de referencia',
        name: 'speaker_wav',
        description: 'Audio corto (3–10 s) para clonar timbre. Opcional.',
      },
    },
  },
];

export function getLocalTtsModelById(id) {
  return localTtsModels.find((m) => m.id === id) || null;
}

export function isLocalTtsModelId(id) {
  return String(id || '').startsWith('local-xtts');
}
