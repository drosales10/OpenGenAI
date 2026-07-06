export * from './models.js';
export { ollamaT2iModels, getOllamaModelById, isOllamaModelId } from './ollamaModels.js';
export { localAudioModels, getLocalAudioModelById, isLocalAudioModelId } from './localAudioModels.js';
export { localTtsModels, getLocalTtsModelById, isLocalTtsModelId, XTTS_LANGUAGES } from './localTtsModels.js';
export {
  comfyuiT2iModels,
  comfyuiI2iModels,
  comfyuiT2vModels,
  comfyuiAudioModels,
  getComfyuiModelById,
  isComfyuiModelId,
} from './comfyuiModels.js';

import { t2iModels, t2vModels, i2iModels, i2vModels, audioModels } from './models.js';
import { ollamaT2iModels } from './ollamaModels.js';
import { localAudioModels } from './localAudioModels.js';
import { localTtsModels } from './localTtsModels.js';
import {
  comfyuiT2iModels,
  comfyuiI2iModels,
  comfyuiT2vModels,
  comfyuiAudioModels,
} from './comfyuiModels.js';
import {
  wan2gpT2iModels,
  wan2gpT2vModels,
  wan2gpI2vModels,
  isWan2gpEndpoint,
} from './wan2gpModels.js';

export const allT2iModels = [...t2iModels, ...ollamaT2iModels, ...wan2gpT2iModels, ...comfyuiT2iModels];
export const allT2vModels = [...t2vModels, ...wan2gpT2vModels, ...comfyuiT2vModels];
export const allI2iModels = [...i2iModels, ...comfyuiI2iModels];
export const allI2vModels = [...i2vModels, ...wan2gpI2vModels];
export const allAudioModels = [...audioModels, ...localAudioModels, ...comfyuiAudioModels];

export function isLocalProviderModelId(id) {
  return (
    String(id || '').startsWith('ollama-')
    || String(id || '').startsWith('wan2gp-')
    || String(id || '').startsWith('comfy-')
    || String(id || '').startsWith('local-musicgen')
    || String(id || '').startsWith('local-ace')
    || String(id || '').startsWith('local-xtts')
  );
}

export { isWan2gpEndpoint };

export function getStudioModelById(id) {
  return (
    allT2iModels.find((m) => m.id === id)
    || allT2vModels.find((m) => m.id === id)
    || allI2iModels.find((m) => m.id === id)
    || allI2vModels.find((m) => m.id === id)
    || allAudioModels.find((m) => m.id === id)
    || localTtsModels.find((m) => m.id === id)
    || null
  );
}
