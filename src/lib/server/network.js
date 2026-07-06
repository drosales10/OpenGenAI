const CONNECTIVITY_URLS = [
  'https://connectivitycheck.gstatic.com/generate_204',
  'https://www.google.com/generate_204',
];

/**
 * Comprueba si hay salida a internet (timeout corto).
 * Usado para elegir Gemini vs Ollama en chat de agentes.
 */
export async function isInternetAvailable(timeoutMs = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    for (const url of CONNECTIVITY_URLS) {
      try {
        const res = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          cache: 'no-store',
        });
        if (res.ok || res.status === 204) return true;
      } catch {
        // probar siguiente URL
      }
    }
    return false;
  } finally {
    clearTimeout(timer);
  }
}
