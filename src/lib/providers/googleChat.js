/**
 * Chat de texto con Gemini API (generateContent).
 * Familia 3.x — gemini-2.5-* está en retirada (oct 2026).
 * @see https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash
 */

import { getProviderCredentialsForApi } from '@/src/lib/db/providerCredentials';

const GOOGLE_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/** Orden: GA primero, previews como respaldo */
const DEFAULT_GEMINI_CHAT_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.1-pro-preview',
];

function resolveGeminiChatModels() {
  const envModel = process.env.GEMINI_CHAT_MODEL || process.env.GOOGLE_CHAT_MODEL;
  if (envModel) return [envModel, ...DEFAULT_GEMINI_CHAT_MODELS];
  return DEFAULT_GEMINI_CHAT_MODELS;
}

export async function resolveGoogleApiKeyForAgents() {
  const moduleCreds = await getProviderCredentialsForApi('agents_studio', 'google');
  if (moduleCreds?.api_key) return moduleCreds.api_key.trim();

  const globalCreds = await getProviderCredentialsForApi('_global', 'google');
  if (globalCreds?.api_key) return globalCreds.api_key.trim();

  return (
    process.env.GOOGLE_API_KEY
    || process.env.GEMINI_API_KEY
    || ''
  ).trim();
}

function toGeminiRole(role) {
  if (role === 'assistant') return 'model';
  if (role === 'user' || role === 'model') return role;
  return 'user';
}

function buildGeminiContents(history, userMessage) {
  const contents = history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: toGeminiRole(m.role),
      parts: [{ text: String(m.content || '') }],
    }));

  contents.push({
    role: 'user',
    parts: [{ text: String(userMessage || '') }],
  });

  return contents;
}

function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((p) => p.text)
    .filter(Boolean)
    .join('\n')
    .trim();
}

function buildGenerationConfig() {
  // Gemini 3.x: evitar temperature/top_p/top_k (deprecados en 3.5+)
  return { maxOutputTokens: 8192 };
}

async function callGeminiModel({ apiKey, model, systemPrompt, history, userMessage }) {
  const url = `${GOOGLE_API_BASE}/models/${model}:generateContent`;

  const body = {
    systemInstruction: {
      parts: [{ text: systemPrompt || 'You are a helpful assistant.' }],
    },
    contents: buildGeminiContents(history, userMessage),
    generationConfig: buildGenerationConfig(),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data?.error?.message || JSON.stringify(data).slice(0, 300);
    throw new Error(`Gemini ${model} (${response.status}): ${msg}`);
  }

  const text = extractGeminiText(data);
  if (!text) throw new Error(`Gemini ${model}: respuesta vacía`);
  return text;
}

/**
 * Llama a Gemini probando modelos en orden hasta que uno responda.
 */
export async function callGeminiChat({ apiKey, systemPrompt, history, userMessage }) {
  const models = resolveGeminiChatModels();
  let lastError;

  for (const model of models) {
    try {
      const text = await callGeminiModel({
        apiKey,
        model,
        systemPrompt,
        history,
        userMessage,
      });
      return { text, model, provider: 'google' };
    } catch (error) {
      lastError = error;
      const retryable = /404|not found|unsupported|invalid model/i.test(error.message);
      if (!retryable) throw error;
    }
  }

  throw lastError || new Error('No Gemini chat model available');
}
