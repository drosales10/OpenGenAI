/**
 * Catálogo de módulos, proveedores y contratos de credenciales.
 * Fuente de verdad para la UI de Settings y las rutas API de providers.
 */

export const PROVIDER_DEFINITIONS = {
  muapi: {
    id: 'muapi',
    label: 'MuAPI',
    labelEs: 'MuAPI',
    description: 'Agregador unificado de modelos de imagen, video, audio y más.',
    descriptionEs: 'Agregador unificado de modelos de imagen, video, audio y más.',
    docsUrl: 'https://muapi.ai',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        labelEs: 'Clave API',
        type: 'password',
        required: true,
        placeholder: 'muapi_...',
      },
      {
        key: 'base_url',
        label: 'Base URL',
        labelEs: 'URL base',
        type: 'url',
        required: false,
        default: 'https://api.muapi.ai',
        placeholder: 'https://api.muapi.ai',
      },
    ],
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    labelEs: 'OpenAI',
    description: 'GPT, DALL·E, Sora y modelos de lenguaje OpenAI.',
    descriptionEs: 'GPT, DALL·E, Sora y modelos de lenguaje OpenAI.',
    docsUrl: 'https://platform.openai.com/api-keys',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        labelEs: 'Clave API',
        type: 'password',
        required: true,
        placeholder: 'sk-...',
      },
      {
        key: 'org_id',
        label: 'Organization ID',
        labelEs: 'ID de organización',
        type: 'text',
        required: false,
        placeholder: 'org-...',
      },
    ],
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    labelEs: 'Anthropic',
    description: 'Claude y modelos de lenguaje Anthropic.',
    descriptionEs: 'Claude y modelos de lenguaje Anthropic.',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        labelEs: 'Clave API',
        type: 'password',
        required: true,
        placeholder: 'sk-ant-...',
      },
    ],
  },
  google: {
    id: 'google',
    label: 'Google AI / Gemini 3.x',
    labelEs: 'Google AI / Gemini 3.x',
    description: 'Imagen vía gemini-3.1-flash-image y gemini-3-pro-image (Nano Banana 2/Pro).',
    descriptionEs: 'Imagen vía gemini-3.1-flash-image y gemini-3-pro-image (Nano Banana 2/Pro).',
    docsUrl: 'https://aistudio.google.com/apikey',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        labelEs: 'Clave API',
        type: 'password',
        required: true,
        placeholder: 'AIza...',
      },
    ],
  },
  fal: {
    id: 'fal',
    label: 'fal.ai',
    labelEs: 'fal.ai',
    description: 'Inferencia serverless para modelos de imagen y video.',
    descriptionEs: 'Inferencia serverless para modelos de imagen y video.',
    docsUrl: 'https://fal.ai/dashboard/keys',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        labelEs: 'Clave API',
        type: 'password',
        required: true,
        placeholder: 'fal_...',
      },
    ],
  },
  replicate: {
    id: 'replicate',
    label: 'Replicate',
    labelEs: 'Replicate',
    description: 'Modelos open source en la nube vía Replicate.',
    descriptionEs: 'Modelos open source en la nube vía Replicate.',
    docsUrl: 'https://replicate.com/account/api-tokens',
    fields: [
      {
        key: 'api_key',
        label: 'API Token',
        labelEs: 'Token API',
        type: 'password',
        required: true,
        placeholder: 'r8_...',
      },
    ],
  },
  local: {
    id: 'local',
    label: 'Local Inference',
    labelEs: 'Inferencia local',
    description: 'Modelos ejecutados localmente (sd.cpp, Wan2GP, Ollama). Sin clave API.',
    descriptionEs: 'Modelos ejecutados localmente (sd.cpp, Wan2GP, Ollama). Sin clave API.',
    fields: [],
    readOnly: true,
  },
  ollama: {
    id: 'ollama',
    label: 'Ollama',
    labelEs: 'Ollama',
    description: 'Servidor Ollama local para imagen open source (Z-Image, FLUX Klein).',
    descriptionEs: 'Servidor Ollama local para imagen open source (Z-Image, FLUX Klein).',
    docsUrl: 'https://ollama.com/download',
    fields: [
      {
        key: 'base_url',
        label: 'Ollama host',
        labelEs: 'Host Ollama',
        type: 'url',
        required: true,
        default: 'http://127.0.0.1:11434',
        placeholder: 'http://127.0.0.1:11434',
      },
    ],
  },
  wan2gp: {
    id: 'wan2gp',
    label: 'Wan2GP',
    labelEs: 'Wan2GP',
    description: 'Servidor Wan2GP (Gradio) para video e imagen open source.',
    descriptionEs: 'Servidor Wan2GP (Gradio) para video e imagen open source.',
    docsUrl: 'https://github.com/deepbeepmeep/Wan2GP',
    fields: [
      {
        key: 'base_url',
        label: 'Wan2GP URL',
        labelEs: 'URL Wan2GP',
        type: 'url',
        required: true,
        default: 'http://127.0.0.1:7860',
        placeholder: 'http://127.0.0.1:7860',
      },
    ],
  },
  local_audio: {
    id: 'local_audio',
    label: 'Local Audio',
    labelEs: 'Audio local',
    description: 'Servidor MusicGen / ACE-Step / XTTS local.',
    descriptionEs: 'Servidor MusicGen / ACE-Step / XTTS local.',
    docsUrl: 'https://github.com/facebookresearch/audiocraft',
    fields: [
      {
        key: 'base_url',
        label: 'Audio server URL',
        labelEs: 'URL servidor audio',
        type: 'url',
        required: true,
        default: 'http://127.0.0.1:8765',
        placeholder: 'http://127.0.0.1:8765',
      },
    ],
  },
  comfyui: {
    id: 'comfyui',
    label: 'ComfyUI',
    labelEs: 'ComfyUI',
    description: 'ComfyUI API — imagen, video y audio local.',
    descriptionEs: 'ComfyUI API — imagen, video y audio local.',
    docsUrl: 'https://github.com/comfyanonymous/ComfyUI',
    fields: [
      {
        key: 'base_url',
        label: 'ComfyUI URL',
        labelEs: 'URL ComfyUI',
        type: 'url',
        required: true,
        default: 'http://127.0.0.1:8188',
        placeholder: 'http://127.0.0.1:8188',
      },
    ],
  },
};

/** Mapeo de route_group del proxy → module_id */
export const ROUTE_GROUP_TO_MODULE = {
  agents: 'agents_studio',
  workflow: 'workflow_studio',
  app: 'apps_studio',
  'creative-agent': 'design_agent',
  generation: 'image_studio',
};

export const MODULE_CATEGORIES = [
  {
    id: 'generation',
    label: 'Generación',
    labelEs: 'Generación',
    modules: [
      {
        id: 'image_studio',
        label: 'Image Studio',
        labelEs: 'Estudio de Imagen',
        description: 'Text-to-image e image-to-image (Flux, SDXL, Nano Banana, etc.)',
        descriptionEs: 'Texto a imagen e imagen a imagen (Flux, SDXL, Nano Banana, etc.)',
        routeGroup: 'generation',
        modelKinds: ['t2i', 'i2i'],
        providers: ['muapi', 'ollama', 'wan2gp', 'comfyui'],
      },
      {
        id: 'video_studio',
        label: 'Video Studio',
        labelEs: 'Estudio de Video',
        description: 'Text-to-video, image-to-video y video-to-video (Kling, Wan, Veo, Wan2GP local…)',
        descriptionEs: 'Texto a video, imagen a video y video a video (Kling, Wan, Veo, Wan2GP local…)',
        routeGroup: 'generation',
        modelKinds: ['t2v', 'i2v', 'v2v'],
        providers: ['muapi', 'wan2gp', 'comfyui'],
      },
      {
        id: 'audio_studio',
        label: 'Audio Studio',
        labelEs: 'Estudio de Audio',
        description: 'Música, voz y TTS (Suno, MiniMax, MMAudio, etc.)',
        descriptionEs: 'Música, voz y TTS (Suno, MiniMax, MMAudio, etc.)',
        routeGroup: 'generation',
        modelKinds: ['audio'],
        providers: ['muapi', 'local_audio', 'comfyui'],
      },
      {
        id: 'lipsync_studio',
        label: 'Lip Sync',
        labelEs: 'Sincronización labial',
        description: 'Sincronización de labios en imagen y video',
        descriptionEs: 'Sincronización de labios en imagen y video',
        routeGroup: 'generation',
        modelKinds: ['lipsync', 'tts'],
        providers: ['muapi', 'local_audio'],
      },
      {
        id: 'recast_studio',
        label: 'Body Swap / Recast',
        labelEs: 'Body Swap / Recast',
        description: 'Control de movimiento y reemplazo corporal',
        descriptionEs: 'Control de movimiento y reemplazo corporal',
        routeGroup: 'generation',
        modelKinds: ['recast'],
        providers: ['muapi'],
      },
      {
        id: 'cinema_studio',
        label: 'Cinema Studio',
        labelEs: 'Cinema Studio',
        description: 'Generación cinematográfica con Nano Banana Pro',
        descriptionEs: 'Generación cinematográfica con Nano Banana Pro',
        routeGroup: 'generation',
        modelKinds: ['cinema'],
        providers: ['muapi'],
      },
      {
        id: 'clipping_studio',
        label: 'AI Clipping',
        labelEs: 'Recorte con IA',
        description: 'Recorte automático de contenido con IA',
        descriptionEs: 'Recorte automático de contenido con IA',
        routeGroup: 'generation',
        modelKinds: ['clipping'],
        providers: ['muapi'],
      },
      {
        id: 'vibe_motion',
        label: 'Vibe Motion',
        labelEs: 'Vibe Motion',
        description: 'Gráficos en movimiento y motion graphics',
        descriptionEs: 'Gráficos en movimiento y motion graphics',
        routeGroup: 'generation',
        modelKinds: ['motion'],
        providers: ['muapi'],
      },
      {
        id: 'marketing_studio',
        label: 'Marketing Studio',
        labelEs: 'Marketing Studio',
        description: 'Anuncios y contenido de marketing con Seedance',
        descriptionEs: 'Anuncios y contenido de marketing con Seedance',
        routeGroup: 'generation',
        modelKinds: ['marketing'],
        providers: ['muapi'],
      },
    ],
  },
  {
    id: 'automation',
    label: 'Agentes y Automatización',
    labelEs: 'Agentes y Automatización',
    modules: [
      {
        id: 'workflow_studio',
        label: 'Workflow Studio',
        labelEs: 'Estudio de Workflows',
        description: 'Editor de flujos de trabajo y pipelines de generación',
        descriptionEs: 'Editor de flujos de trabajo y pipelines de generación',
        routeGroup: 'workflow',
        modelKinds: ['workflow'],
        providers: ['muapi'],
      },
      {
        id: 'agents_studio',
        label: 'AI Agents',
        labelEs: 'Agentes IA',
        description: 'Chat con agentes y LLMs (GPT, Claude, Gemini vía MuAPI)',
        descriptionEs: 'Chat con agentes y LLMs (GPT, Claude, Gemini vía MuAPI)',
        routeGroup: 'agents',
        modelKinds: ['agents', 'llm'],
        providers: ['muapi', 'openai', 'anthropic', 'google'],
      },
      {
        id: 'design_agent',
        label: 'Design Agent',
        labelEs: 'Agente de Diseño',
        description: 'Canvas creativo y agente de diseño',
        descriptionEs: 'Canvas creativo y agente de diseño',
        routeGroup: 'creative-agent',
        modelKinds: ['design'],
        providers: ['muapi'],
      },
    ],
  },
  {
    id: 'platform',
    label: 'Plataforma',
    labelEs: 'Plataforma',
    modules: [
      {
        id: 'apps_studio',
        label: 'Explore Apps',
        labelEs: 'Explorar Apps',
        description: 'Catálogo de aplicaciones y balance de cuenta',
        descriptionEs: 'Catálogo de aplicaciones y balance de cuenta',
        routeGroup: 'app',
        modelKinds: ['apps'],
        providers: ['muapi'],
      },
      {
        id: '_global',
        label: 'Clave global (fallback)',
        labelEs: 'Clave global (fallback)',
        description: 'Clave por defecto cuando no hay override por módulo',
        descriptionEs: 'Clave por defecto cuando no hay override por módulo',
        routeGroup: null,
        modelKinds: [],
        providers: ['muapi', 'google', 'openai', 'fal', 'replicate', 'ollama', 'wan2gp', 'local_audio', 'comfyui'],
        isGlobal: true,
      },
      {
        id: 'local_inference',
        label: 'Local Models',
        labelEs: 'Modelos locales',
        description: 'Inferencia local: Ollama (web), sd.cpp y Wan2GP (Electron)',
        descriptionEs: 'Inferencia local: Ollama (web), sd.cpp y Wan2GP (Electron)',
        routeGroup: null,
        modelKinds: ['local'],
        providers: ['local', 'ollama', 'wan2gp', 'local_audio', 'comfyui'],
      },
    ],
  },
];

export function getModuleById(moduleId) {
  for (const category of MODULE_CATEGORIES) {
    const mod = category.modules.find((m) => m.id === moduleId);
    if (mod) return { ...mod, categoryId: category.id, categoryLabel: category.label };
  }
  return null;
}

export function getProviderDefinition(providerId) {
  return PROVIDER_DEFINITIONS[providerId] || null;
}

export function getAllModules() {
  return MODULE_CATEGORIES.flatMap((cat) =>
    cat.modules.map((mod) => ({
      ...mod,
      categoryId: cat.id,
      categoryLabel: cat.label,
      categoryLabelEs: cat.labelEs,
    }))
  );
}

export function buildCatalogResponse(lang = 'es') {
  const useEs = lang === 'es' || lang === 'zh-CN';
  const labelKey = useEs ? 'labelEs' : 'label';
  const descKey = useEs ? 'descriptionEs' : 'description';

  return {
    categories: MODULE_CATEGORIES.map((cat) => ({
      id: cat.id,
      label: cat[labelKey] || cat.label,
      modules: cat.modules.map((mod) => ({
        id: mod.id,
        label: mod[labelKey] || mod.label,
        description: mod[descKey] || mod.description,
        routeGroup: mod.routeGroup,
        modelKinds: mod.modelKinds,
        isGlobal: Boolean(mod.isGlobal),
        providers: mod.providers.map((pid) => {
          const def = PROVIDER_DEFINITIONS[pid];
          if (!def) return { id: pid };
          return {
            id: def.id,
            label: def[labelKey] || def.label,
            description: def[descKey] || def.description,
            docsUrl: def.docsUrl || null,
            readOnly: Boolean(def.readOnly),
            fields: (def.fields || []).map((f) => ({
              key: f.key,
              label: f[labelKey] || f.label,
              type: f.type,
              required: Boolean(f.required),
              default: f.default ?? null,
              placeholder: f.placeholder ?? '',
            })),
          };
        }),
      })),
    })),
    providerDefinitions: Object.values(PROVIDER_DEFINITIONS).map((def) => ({
      id: def.id,
      label: def[labelKey] || def.label,
      description: def[descKey] || def.description,
      docsUrl: def.docsUrl || null,
      readOnly: Boolean(def.readOnly),
      fields: (def.fields || []).map((f) => ({
        key: f.key,
        label: f[labelKey] || f.label,
        type: f.type,
        required: Boolean(f.required),
        default: f.default ?? null,
        placeholder: f.placeholder ?? '',
      })),
    })),
  };
}

export function resolveModuleForRouteGroup(routeGroup) {
  return ROUTE_GROUP_TO_MODULE[routeGroup] || '_global';
}
