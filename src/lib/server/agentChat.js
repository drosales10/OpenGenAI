import crypto from 'crypto';
import { createJob } from '@/src/lib/db/jobs';
import { ollamaFetch, resolveOllamaHostFromEnv } from '@/src/lib/providers/ollamaShared';
import { callGeminiChat, resolveGoogleApiKeyForAgents } from '@/src/lib/providers/googleChat';
import { isInternetAvailable } from '@/src/lib/server/network';
import { getProviderCredentialsForApi } from '@/src/lib/db/providerCredentials';
import {
  getOrCreateConversation,
  appendMessage,
  getConversationMessages,
  updateConversationTitle,
} from '@/src/lib/db/agentConversations';
import { getAgentDbId } from '@/src/lib/db/agents';

/** Modelos Ollama que no sirven para chat conversacional */
const NON_CHAT_MODEL_PATTERNS = [
  /embed/i,
  /ocr/i,
  /bge-/i,
  /mxbai-embed/i,
  /nomic-embed/i,
  /vision/i,
  /clip/i,
];

const CHAT_MODEL_PRIORITY = [
  /llama3\.2/i,
  /llama3\.1/i,
  /llama3/i,
  /qwen2\.5-coder/i,
  /qwen/i,
  /mistral/i,
  /gemma/i,
  /phi/i,
];

function isChatCapableModel(name) {
  return !NON_CHAT_MODEL_PATTERNS.some((re) => re.test(name));
}

function pickChatModel(names) {
  const chatModels = names.filter(isChatCapableModel);
  if (!chatModels.length) return null;

  for (const pattern of CHAT_MODEL_PRIORITY) {
    const match = chatModels.find((n) => pattern.test(n));
    if (match) return match;
  }
  return chatModels[0];
}

function resolveAgentChatBackend() {
  const raw = String(process.env.AGENT_CHAT_BACKEND || 'auto').trim().toLowerCase();
  if (raw === 'gemini' || raw === 'google' || raw === 'online') return 'gemini';
  if (raw === 'ollama' || raw === 'local' || raw === 'offline') return 'ollama';
  return 'auto';
}

async function resolveOllamaHost() {
  const creds = await getProviderCredentialsForApi('_global', 'ollama');
  if (creds?.base_url) return creds.base_url.replace(/\/$/, '');
  const moduleCreds = await getProviderCredentialsForApi('agents_studio', 'ollama');
  if (moduleCreds?.base_url) return moduleCreds.base_url.replace(/\/$/, '');
  return resolveOllamaHostFromEnv();
}

async function resolveOllamaChatModel(host) {
  const envModel = process.env.OLLAMA_CHAT_MODEL || process.env.OLLAMA_MODEL;
  if (envModel) return envModel;

  try {
    const res = await ollamaFetch('/api/tags', { host, timeoutMs: 5000 });
    if (res.ok) {
      const data = await res.json();
      const names = (data.models || []).map((m) => m.name);
      const preferred = pickChatModel(names);
      if (preferred) return preferred;
    }
  } catch {
    // fallback
  }
  return 'llama3.2:latest';
}

async function callOllamaChat({ host, model, systemPrompt, history, userMessage }) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const response = await ollamaFetch('/api/chat', {
    host,
    method: 'POST',
    body: { model, messages, stream: false },
    timeoutMs: 120000,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ollama chat error (${response.status}): ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data.message?.content || data.response || '';
  if (!text) throw new Error('Ollama: respuesta vacía');
  return { text, model, provider: 'ollama' };
}

/**
 * Gemini si hay internet + clave; si no, Ollama local.
 */
async function generateAgentReply({ systemPrompt, history, userMessage }) {
  const backend = resolveAgentChatBackend();
  const googleKey = await resolveGoogleApiKeyForAgents();
  const priorHistory = history.slice(0, -1);

  const tryGemini = async () => {
    if (!googleKey) return null;
    const online = await isInternetAvailable();
    if (!online) return null;
    return callGeminiChat({
      apiKey: googleKey,
      systemPrompt,
      history: priorHistory,
      userMessage,
    });
  };

  const tryOllama = async () => {
    const host = await resolveOllamaHost();
    const model = await resolveOllamaChatModel(host);
    return callOllamaChat({
      host,
      model,
      systemPrompt,
      history: priorHistory,
      userMessage,
    });
  };

  if (backend === 'gemini') {
    if (!googleKey) {
      throw new Error('AGENT_CHAT_BACKEND=gemini pero no hay GOOGLE_API_KEY configurada.');
    }
    return callGeminiChat({
      apiKey: googleKey,
      systemPrompt,
      history: priorHistory,
      userMessage,
    });
  }

  if (backend === 'ollama') {
    return tryOllama();
  }

  // auto: Gemini online → fallback Ollama
  try {
    const geminiResult = await tryGemini();
    if (geminiResult) return geminiResult;
  } catch (error) {
    console.warn('[agentChat] Gemini falló, usando Ollama:', error.message);
  }

  return tryOllama();
}

export async function executeLocalAgentChat({
  agent,
  agentIdentifier,
  userId,
  message,
  conversationId = null,
}) {
  const agentDbId = await getAgentDbId(agentIdentifier);
  if (!agentDbId) throw new Error('Agent not found');

  const conv = await getOrCreateConversation({
    agentDbId,
    userId,
    conversationId,
    title: message.slice(0, 80) || 'New Chat',
  });

  await appendMessage(conv.id, 'user', message);

  const history = await getConversationMessages(conv.id);
  const systemPrompt = agent.system_prompt || 'You are a helpful assistant.';

  let assistantText;
  let chatMeta = { provider: 'unknown', model: null };

  try {
    const result = await generateAgentReply({
      systemPrompt,
      history,
      userMessage: message,
    });
    assistantText = result.text;
    chatMeta = { provider: result.provider, model: result.model };
  } catch (error) {
    assistantText =
      `No pude generar una respuesta. ` +
      `Con internet se usa Gemini (GOOGLE_API_KEY); sin conexión, Ollama local (llama3.2). ` +
      `Detalle: ${error.message}`;
    chatMeta = { provider: 'error', model: null, error: error.message };
  }

  await appendMessage(conv.id, 'assistant', assistantText, chatMeta);
  if (!conv.title || conv.title === 'New Chat') {
    await updateConversationTitle(conv.id, message.slice(0, 80));
  }

  const requestId = crypto.randomUUID();
  const resultPayload = {
    conversation_id: conv.id,
    status: 'completed',
    is_complete: true,
    suggestions: agent.initial_suggestions || [],
    messages: [
      { role: 'assistant', content: assistantText },
    ],
    chat_provider: chatMeta.provider,
    chat_model: chatMeta.model,
  };

  await createJob({
    requestId,
    userId,
    provider: chatMeta.provider === 'google' ? 'google' : 'local',
    jobType: 'agent_chat',
    status: 'completed',
    approvalStatus: 'approved',
    autoApproved: true,
    payload: {
      agentIdentifier,
      conversationId: conv.id,
      message,
      chat_provider: chatMeta.provider,
      chat_model: chatMeta.model,
    },
    result: resultPayload,
    completedAt: new Date().toISOString(),
  });

  return { request_id: requestId, conversation_id: conv.id };
}

export function formatLocalAgentJobResult(job) {
  if (!job) return null;
  let result = job.result;
  if (typeof result === 'string') {
    try {
      result = JSON.parse(result);
    } catch {
      result = null;
    }
  }
  if (result) {
    return {
      ...result,
      status: job.status === 'failed' ? 'failed' : result.status || 'completed',
      error: job.error_message || result.error,
    };
  }
  if (job.status === 'failed') {
    return { status: 'failed', error: job.error_message || 'Agent execution failed' };
  }
  return { status: 'processing', is_complete: false };
}
