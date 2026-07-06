/**
 * Adaptador ComfyUI — imagen, video y audio vía API /prompt.
 */

import { getComfyuiModelById } from '@/src/lib/comfyuiCatalog';
import { buildWorkflowForModel } from '@/src/lib/providers/comfyuiWorkflows';
import {
  extractComfyuiOutputs,
  normalizeComfyuiHost,
  pollComfyuiHistory,
  submitComfyuiPrompt,
  uploadComfyuiImage,
  wrapComfyuiMediaUrl,
} from '@/src/lib/providers/comfyuiShared';

export function isComfyuiModel(modelContext = {}) {
  const id = String(modelContext.id || modelContext.endpoint || '');
  return modelContext.provider === 'comfyui' || id.startsWith('comfy-');
}

export function resolveComfyuiCatalogModel(modelContext = {}) {
  return getComfyuiModelById(modelContext.id || modelContext.endpoint);
}

async function fetchImageBytes(url) {
  if (url.startsWith('data:')) {
    const b64 = url.split(',')[1];
    return Buffer.from(b64, 'base64');
  }
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`No se pudo descargar imagen (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

function pickPrimaryOutput(media, kind) {
  const preferred = media.find((m) => m.kind === kind) || media[0];
  return preferred || null;
}

export async function generateComfyui(modelContext, payload, host) {
  const base = normalizeComfyuiHost(host);
  const catalog = resolveComfyuiCatalogModel(modelContext) || modelContext;
  const workflowId = catalog.workflow || modelContext.workflow;

  if (!workflowId && !catalog.workflow) {
    throw new Error(`Modelo ComfyUI desconocido: ${modelContext.id}`);
  }

  const ctx = { ...catalog, ...modelContext, workflow: workflowId };

  let uploadedImageName = null;
  const imageRef = payload.image_url || payload.image || payload.start_image_url;
  if (imageRef && (ctx.kind === 'i2i' || ctx.needsImage || workflowId === 'sdxl_i2i')) {
    const bytes = await fetchImageBytes(imageRef);
    uploadedImageName = await uploadComfyuiImage(
      base,
      bytes,
      `ogai_${Date.now()}.png`
    );
  }

  const workflow = buildWorkflowForModel(ctx, payload, uploadedImageName);
  const promptId = await submitComfyuiPrompt(base, workflow);
  const historyEntry = await pollComfyuiHistory(base, promptId);

  const media = extractComfyuiOutputs(historyEntry, base);
  if (!media.length) {
    throw new Error('ComfyUI completó sin archivos de salida.');
  }

  const expectedKind = ctx.kind === 't2v' || ctx.kind === 'i2v' || ctx.kind === 'v2v'
    ? 'video'
    : ctx.kind === 'audio'
      ? 'audio'
      : 'image';

  const primary = pickPrimaryOutput(media, expectedKind);
  const url = wrapComfyuiMediaUrl(primary.url);

  return {
    status: 'completed',
    url,
    outputs: media.map((m) => wrapComfyuiMediaUrl(m.url)),
    mediaType: primary.kind,
    comfyui_prompt_id: promptId,
  };
}
