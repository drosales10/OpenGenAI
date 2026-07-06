import crypto from 'crypto';
import { query } from '@/src/lib/postgres';

export async function listUserConversations(userId) {
  if (!userId) return [];
  const result = await query(
    `SELECT
      c.id,
      c.title,
      c.updated_at,
      c.created_at,
      a.public_id AS agent_id,
      a.slug AS agent_slug,
      a.name AS agent_name,
      a.icon_url AS agent_icon_url,
      (SELECT COUNT(*)::int FROM agent_messages m WHERE m.conversation_id = c.id) AS message_count
     FROM agent_conversations c
     JOIN agents a ON a.id = c.agent_id
     WHERE c.user_id = $1
     ORDER BY c.updated_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function getConversationHistory(agentIdentifier, conversationId, userId = null) {
  const agentRes = await query(
    'SELECT id FROM agents WHERE public_id::text = $1 OR lower(slug) = lower($1) LIMIT 1',
    [agentIdentifier]
  );
  const agentDbId = agentRes.rows[0]?.id;
  if (!agentDbId) return null;

  const params = [conversationId, agentDbId];
  let sql = `SELECT c.* FROM agent_conversations c
             WHERE c.id = $1 AND c.agent_id = $2`;
  if (userId) {
    sql += ' AND c.user_id = $3';
    params.push(userId);
  }

  const convRes = await query(sql, params);
  const conv = convRes.rows[0];
  if (!conv) return null;

  const msgRes = await query(
    `SELECT role, content, metadata, created_at AS timestamp
     FROM agent_messages
     WHERE conversation_id = $1
     ORDER BY created_at ASC`,
    [conversationId]
  );

  return {
    id: conv.id,
    conversation_id: conv.id,
    title: conv.title,
    created_at: conv.created_at,
    updated_at: conv.updated_at,
    history: msgRes.rows.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
      ...(m.metadata || {}),
    })),
  };
}

export async function getOrCreateConversation({ agentDbId, userId, conversationId = null, title = null }) {
  if (conversationId) {
    const existing = await query(
      'SELECT * FROM agent_conversations WHERE id = $1 AND agent_id = $2',
      [conversationId, agentDbId]
    );
    if (existing.rows[0]) return existing.rows[0];
  }

  const id = conversationId || crypto.randomUUID();
  const result = await query(
    `INSERT INTO agent_conversations (id, agent_id, user_id, title)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET updated_at = now()
     RETURNING *`,
    [id, agentDbId, userId, title || 'New Chat']
  );
  return result.rows[0];
}

export async function appendMessage(conversationId, role, content, metadata = {}) {
  await query(
    `INSERT INTO agent_messages (conversation_id, role, content, metadata)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [conversationId, role, content, JSON.stringify(metadata || {})]
  );
  await query(
    'UPDATE agent_conversations SET updated_at = now() WHERE id = $1',
    [conversationId]
  );
}

export async function getConversationMessages(conversationId) {
  const result = await query(
    `SELECT role, content FROM agent_messages
     WHERE conversation_id = $1
     ORDER BY created_at ASC`,
    [conversationId]
  );
  return result.rows;
}

export async function updateConversationTitle(conversationId, title) {
  if (!title) return;
  await query(
    'UPDATE agent_conversations SET title = $2, updated_at = now() WHERE id = $1',
    [conversationId, title.slice(0, 120)]
  );
}
