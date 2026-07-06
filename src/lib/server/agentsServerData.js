import { getAgentBySlugOrPublicId } from '@/src/lib/db/agents';
import { getConversationHistory } from '@/src/lib/db/agentConversations';
import { ensureLocalAdminUser } from '@/src/lib/db/apiKeys';
import { bootstrapDatabase } from '@/src/lib/db/bootstrap';

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady) return;
  await bootstrapDatabase();
  schemaReady = true;
}

/**
 * Resuelve usuario para SSR de páginas /agents/*.
 * Usa clave interna/muapi si existe; si no, admin local.
 */
export async function resolveServerAgentUser() {
  await ensureSchema();
  const admin = await ensureLocalAdminUser();
  return { apiKey: null, userId: admin ? Number(admin.id) : null };
}

export async function fetchAgentDetailsServer(agentId, _apiKey, viewerUserId = null) {
  await ensureSchema();
  return getAgentBySlugOrPublicId(agentId, { viewerUserId });
}

export async function fetchConversationHistoryServer(agentId, conversationId, _apiKey, viewerUserId = null) {
  await ensureSchema();
  return getConversationHistory(agentId, conversationId, viewerUserId);
}

export async function fetchMuapiAccountServer(_apiKey) {
  await ensureSchema();
  const admin = await ensureLocalAdminUser();
  if (!admin) return null;
  return {
    email: admin.email,
    balance: 0,
    local: true,
  };
}

// Compat: algunas páginas aún llaman resolveServerMuapiKey
export async function resolveServerMuapiKey(_routeGroup = 'agents') {
  await ensureSchema();
  return null;
}
