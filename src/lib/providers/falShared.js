/**
 * Utilidades compartidas — fal.ai queue API.
 * @see https://fal.ai/docs/documentation/model-apis/inference/queue
 */

export const FAL_QUEUE_BASE = 'https://queue.fal.run';

export function falHeaders(apiKey) {
  return {
    Authorization: `Key ${String(apiKey || '').trim()}`,
    'Content-Type': 'application/json',
  };
}

export function resolveFalApiKeyFromEnv() {
  const key = process.env.FAL_KEY || process.env.FAL_API_KEY;
  return key?.trim() || null;
}

function parseFalError(data, status) {
  const msg =
    data?.detail
    || data?.message
    || data?.error
    || (typeof data === 'string' ? data : null)
    || JSON.stringify(data).slice(0, 400);
  return new Error(`fal.ai (${status}): ${msg}`);
}

export function extractFalImageUrl(result) {
  if (!result) return null;
  const payload = result.data || result;

  if (Array.isArray(payload.images) && payload.images.length) {
    const first = payload.images[0];
    return typeof first === 'string' ? first : first?.url;
  }
  if (payload.image?.url) return payload.image.url;
  if (typeof payload.url === 'string') return payload.url;
  return null;
}

export function extractFalVideoUrl(result) {
  if (!result) return null;
  const payload = result.data || result;

  if (payload.video?.url) return payload.video.url;
  if (Array.isArray(payload.videos) && payload.videos.length) {
    const first = payload.videos[0];
    return typeof first === 'string' ? first : first?.url;
  }
  return null;
}

export function extractFalAudioUrl(result) {
  if (!result) return null;
  const payload = result.data || result;

  if (payload.audio?.url) return payload.audio.url;
  if (Array.isArray(payload.audios) && payload.audios.length) {
    const first = payload.audios[0];
    return typeof first === 'string' ? first : first?.url;
  }
  return null;
}

export function extractFalMediaUrl(result) {
  return extractFalVideoUrl(result) || extractFalAudioUrl(result) || extractFalImageUrl(result);
}

export async function falQueueRun(
  endpointId,
  input,
  apiKey,
  { maxAttempts = 180, interval = 2000 } = {}
) {
  const trimmedKey = String(apiKey || '').trim();
  if (!trimmedKey) throw new Error('Clave de fal.ai no configurada');

  const submitUrl = `${FAL_QUEUE_BASE}/${endpointId}`;
  const submitResponse = await fetch(submitUrl, {
    method: 'POST',
    headers: falHeaders(trimmedKey),
    body: JSON.stringify(input),
  });

  const submitData = await submitResponse.json().catch(() => ({}));
  if (!submitResponse.ok) {
    throw parseFalError(submitData, submitResponse.status);
  }

  const requestId = submitData.request_id;
  if (!requestId) {
    const directUrl = extractFalMediaUrl(submitData);
    if (directUrl) {
      return { ...submitData, url: directUrl, status: 'completed' };
    }
    throw new Error('fal.ai: respuesta sin request_id');
  }

  const statusUrl =
    submitData.status_url
    || `${FAL_QUEUE_BASE}/${endpointId}/requests/${requestId}/status`;
  const resultUrl =
    submitData.response_url
    || `${FAL_QUEUE_BASE}/${endpointId}/requests/${requestId}`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, interval));

    const statusResponse = await fetch(`${statusUrl}?logs=0`, {
      headers: { Authorization: `Key ${trimmedKey}` },
    });

    if (!statusResponse.ok) {
      if (statusResponse.status >= 500) continue;
      const errData = await statusResponse.json().catch(() => ({}));
      throw parseFalError(errData, statusResponse.status);
    }

    const statusData = await statusResponse.json();
    const status = String(statusData.status || '').toUpperCase();

    if (status === 'COMPLETED') {
      if (statusData.error) {
        throw new Error(statusData.error);
      }

      const resultResponse = await fetch(resultUrl, {
        headers: { Authorization: `Key ${trimmedKey}` },
      });
      const resultData = await resultResponse.json().catch(() => ({}));
      if (!resultResponse.ok) {
        throw parseFalError(resultData, resultResponse.status);
      }

      const url = extractFalMediaUrl(resultData);
      if (!url) {
        throw new Error('fal.ai: generación completada sin URL de resultado');
      }
      return { ...resultData, url, status: 'completed', fal_request_id: requestId };
    }

    if (status === 'FAILED' || status === 'ERROR') {
      throw new Error(statusData.error || 'Generación fallida en fal.ai');
    }
  }

  throw new Error('fal.ai: tiempo de espera agotado');
}
