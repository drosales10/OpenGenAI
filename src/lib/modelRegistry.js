import {
  t2iModels,
  t2vModels,
  i2iModels,
  i2vModels,
  v2vModels,
  lipsyncModels,
  recastModels,
  audioModels,
} from '../../packages/studio/src/models.js';
import { ollamaT2iModels } from '../../packages/studio/src/ollamaModels.js';
import { localAudioModels } from '../../packages/studio/src/localAudioModels.js';
import { localTtsModels } from '../../packages/studio/src/localTtsModels.js';
import {
  wan2gpT2iModels,
  wan2gpT2vModels,
  wan2gpI2vModels,
} from '../../packages/studio/src/wan2gpModels.js';
import {
  comfyuiT2iModels,
  comfyuiI2iModels,
  comfyuiT2vModels,
  comfyuiAudioModels,
} from '../../packages/studio/src/comfyuiModels.js';
import { inferProviderForModel, getProviderMeta } from '@/src/lib/modelProviders';

const MODULE_MODEL_MAP = {
  image_studio: [
    { kind: 't2i', models: [...t2iModels, ...ollamaT2iModels, ...wan2gpT2iModels, ...comfyuiT2iModels] },
    { kind: 'i2i', models: [...i2iModels, ...comfyuiI2iModels] },
  ],
  video_studio: [
    { kind: 't2v', models: [...t2vModels, ...wan2gpT2vModels, ...comfyuiT2vModels] },
    { kind: 'i2v', models: [...i2vModels, ...wan2gpI2vModels] },
    { kind: 'v2v', models: v2vModels },
  ],
  audio_studio: [{ kind: 'audio', models: [...audioModels, ...localAudioModels, ...comfyuiAudioModels] }],
  lipsync_studio: [
    { kind: 'lipsync', models: lipsyncModels },
    { kind: 'tts', models: localTtsModels },
  ],
  recast_studio: [{ kind: 'recast', models: recastModels }],
  cinema_studio: [
    {
      kind: 'cinema',
      models: [...t2iModels, ...i2iModels].filter((m) =>
        /nano-banana|cinema/.test(m.id)
      ),
    },
  ],
  clipping_studio: [
    {
      kind: 'clipping',
      models: [{ id: 'ai-clipping', name: 'AI Clipping', endpoint: 'ai-clipping' }],
    },
  ],
  vibe_motion: [
    {
      kind: 'motion',
      models: [
        { id: 'motion-graphics', name: 'Motion Graphics', endpoint: 'motion-graphics' },
        { id: 'motion-graphics-edit', name: 'Motion Graphics Edit', endpoint: 'motion-graphics-edit' },
      ],
    },
  ],
  marketing_studio: [
    {
      kind: 'marketing',
      models: [...t2vModels, ...i2vModels].filter((m) => /seedance|marketing|vip-omni/.test(m.id)),
    },
  ],
  workflow_studio: [],
  agents_studio: [],
  design_agent: [],
  apps_studio: [],
};

const ENDPOINT_INDEX = new Map();

function registerModel(model, moduleId, kind) {
  const entry = {
    id: model.id,
    name: model.name || model.id,
    endpoint: model.endpoint || model.id,
    kind,
    moduleId,
    provider: model.provider || inferProviderForModel(model),
    family: model.family || null,
    ollamaModel: model.ollamaModel || null,
    wan2gpId: model.wan2gpId || null,
    engine: model.engine || null,
    localAudioModel: model.localAudioModel || null,
    modelKind: model.modelKind || null,
    comfyuiWorkflow: model.workflow || model.comfyuiWorkflow || null,
  };

  ENDPOINT_INDEX.set(entry.endpoint, entry);
  ENDPOINT_INDEX.set(entry.id, entry);
  return entry;
}

function buildRegistry() {
  const byModule = {};

  for (const [moduleId, groups] of Object.entries(MODULE_MODEL_MAP)) {
    const models = [];
    for (const group of groups) {
      for (const model of group.models || []) {
        models.push(registerModel(model, moduleId, group.kind));
      }
    }
    byModule[moduleId] = models;
  }

  return byModule;
}

const REGISTRY_BY_MODULE = buildRegistry();

export function getModelsForModule(moduleId) {
  return REGISTRY_BY_MODULE[moduleId] || [];
}

export function getAllRegisteredModels() {
  return Object.entries(REGISTRY_BY_MODULE).flatMap(([moduleId, models]) =>
    models.map((m) => ({ ...m, moduleId }))
  );
}

export function findModelByEndpoint(endpointOrId) {
  if (!endpointOrId) return null;
  return ENDPOINT_INDEX.get(endpointOrId) || null;
}

export function findModelContext(endpointOrId) {
  const model = findModelByEndpoint(endpointOrId);
  if (!model) {
    return {
      id: endpointOrId,
      name: endpointOrId,
      endpoint: endpointOrId,
      moduleId: 'image_studio',
      kind: 'unknown',
      provider: inferProviderForModel({ id: endpointOrId, endpoint: endpointOrId }),
    };
  }
  return model;
}

export function buildModelsCatalog(lang = 'es') {
  const useEs = lang === 'es' || lang.startsWith('zh');

  return getAllRegisteredModels().map((model) => {
    const meta = getProviderMeta(model.provider);
    return {
      model_key: model.id,
      name: model.name,
      endpoint: model.endpoint,
      module_id: model.moduleId,
      model_kind: model.kind,
      provider_id: model.provider,
      provider_label: useEs ? (meta.labelEs || meta.label) : meta.label,
      provider_docs_url: meta.docsUrl || null,
      supports_direct: Boolean(meta.supportsDirect),
      family: model.family,
    };
  });
}

export { MODULE_MODEL_MAP };
