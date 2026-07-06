import crypto from 'crypto';
import { query } from '@/src/lib/postgres';
import { AGENT_SKILL_SEEDS, AGENT_TEMPLATE_SEEDS } from '@/src/lib/db/agentTemplatesSeed';

function slugify(text) {
  const base = String(text || 'agent')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || 'agent';
}

function rowToAgent(row, { skills = [], isOwner = false, hasLiked = false } = {}) {
  if (!row) return null;
  return {
    id: row.public_id,
    agent_id: row.public_id,
    slug: row.slug,
    agent_slug: row.slug,
    name: row.name,
    description: row.description || '',
    system_prompt: row.system_prompt,
    welcome_message: row.welcome_message || '',
    initial_suggestions: row.initial_suggestions || [],
    icon_url: row.icon_url || null,
    category: row.category || 'AI Assistant',
    theme: row.theme || 'cosmic',
    is_template: Boolean(row.is_template),
    is_published: Boolean(row.is_published),
    is_owner: isOwner,
    has_liked: hasLiked,
    like_count: Number(row.like_count || 0),
    owner_username: row.owner_display_name || row.owner_email?.split('@')[0] || 'local',
    owner_email: row.owner_email || null,
    skills,
    skill_ids: skills.map((s) => s.id),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function loadSkillsForAgent(agentDbId) {
  const result = await query(
    `SELECT s.id, s.name, s.description
     FROM agent_skill_links l
     JOIN agent_skills s ON s.id = l.skill_id
     WHERE l.agent_id = $1
     ORDER BY s.name`,
    [agentDbId]
  );
  return result.rows;
}

async function attachSkills(agentDbId, skillIds = []) {
  await query('DELETE FROM agent_skill_links WHERE agent_id = $1', [agentDbId]);
  const unique = [...new Set((skillIds || []).filter(Boolean))];
  for (const skillId of unique) {
    await query(
      `INSERT INTO agent_skills (id, name, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [skillId, skillId, '']
    );
    await query(
      `INSERT INTO agent_skill_links (agent_id, skill_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [agentDbId, skillId]
    );
  }
}

async function ensureUniqueSlug(baseSlug, excludeAgentDbId = null) {
  let slug = baseSlug;
  let suffix = 1;
  while (true) {
    const params = [slug];
    let sql = 'SELECT id FROM agents WHERE slug = $1';
    if (excludeAgentDbId) {
      sql += ' AND id <> $2';
      params.push(excludeAgentDbId);
    }
    const existing = await query(sql, params);
    if (!existing.rows.length) return slug;
    suffix += 1;
    slug = `${baseSlug}-${suffix}`.slice(0, 56);
  }
}

export async function seedAgentCatalog() {
  for (const skill of AGENT_SKILL_SEEDS) {
    await query(
      `INSERT INTO agent_skills (id, name, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description`,
      [skill.id, skill.name, skill.description]
    );
  }

  for (const tpl of AGENT_TEMPLATE_SEEDS) {
    const existing = await query('SELECT id FROM agents WHERE slug = $1 AND is_template = true', [tpl.slug]);
    if (existing.rows.length) continue;

    const publicId = crypto.randomUUID();
    const result = await query(
      `INSERT INTO agents (
        public_id, slug, user_id, name, description, system_prompt,
        welcome_message, initial_suggestions, icon_url, theme,
        is_template, is_published, category
      ) VALUES ($1, $2, NULL, $3, $4, $5, $6, $7::jsonb, $8, $9, true, true, $10)
      RETURNING id`,
      [
        publicId,
        tpl.slug,
        tpl.name,
        tpl.description,
        tpl.system_prompt,
        tpl.welcome_message,
        JSON.stringify(tpl.initial_suggestions || []),
        tpl.icon_url || null,
        tpl.theme || 'cosmic',
        tpl.category || 'AI Assistant',
      ]
    );
    await attachSkills(result.rows[0].id, tpl.skill_ids || []);
  }
}

export async function listAgentSkills() {
  const result = await query('SELECT id, name, description FROM agent_skills ORDER BY name');
  return result.rows;
}

export async function listTemplateAgents() {
  const result = await query(
    `SELECT a.*, u.display_name AS owner_display_name, u.email AS owner_email
     FROM agents a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.is_template = true AND a.is_published = true
     ORDER BY a.name`
  );
  const agents = [];
  for (const row of result.rows) {
    const skills = await loadSkillsForAgent(row.id);
    agents.push(rowToAgent(row, { skills, isOwner: false }));
  }
  return agents;
}

export async function listFeaturedAgents() {
  const result = await query(
    `SELECT a.*, u.display_name AS owner_display_name, u.email AS owner_email
     FROM agents a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.is_published = true
     ORDER BY a.like_count DESC, a.updated_at DESC
     LIMIT 12`
  );
  const agents = [];
  for (const row of result.rows) {
    const skills = await loadSkillsForAgent(row.id);
    agents.push(rowToAgent(row, { skills, isOwner: false }));
  }
  return agents;
}

export async function listUserAgents(userId) {
  if (!userId) return [];
  const result = await query(
    `SELECT a.*, u.display_name AS owner_display_name, u.email AS owner_email
     FROM agents a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.user_id = $1 AND a.is_template = false
     ORDER BY a.updated_at DESC`,
    [userId]
  );
  const agents = [];
  for (const row of result.rows) {
    const skills = await loadSkillsForAgent(row.id);
    agents.push(rowToAgent(row, { skills, isOwner: true }));
  }
  return agents;
}

export async function getAgentBySlugOrPublicId(identifier, { viewerUserId = null } = {}) {
  const result = await query(
    `SELECT a.*, u.display_name AS owner_display_name, u.email AS owner_email
     FROM agents a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE lower(a.slug) = lower($1) OR a.public_id::text = $1
     LIMIT 1`,
    [identifier]
  );
  const row = result.rows[0];
  if (!row) return null;

  const skills = await loadSkillsForAgent(row.id);
  const isOwner = viewerUserId != null && Number(row.user_id) === Number(viewerUserId);

  let hasLiked = false;
  if (viewerUserId) {
    const liked = await query(
      'SELECT 1 FROM agent_likes WHERE agent_id = $1 AND user_id = $2',
      [row.id, viewerUserId]
    );
    hasLiked = liked.rows.length > 0;
  }

  return rowToAgent(row, { skills, isOwner, hasLiked });
}

export async function createAgent(payload, userId) {
  const publicId = crypto.randomUUID();
  const baseSlug = slugify(payload.slug || payload.name);
  const slug = await ensureUniqueSlug(baseSlug);

  const result = await query(
    `INSERT INTO agents (
      public_id, slug, user_id, name, description, system_prompt,
      welcome_message, initial_suggestions, icon_url, theme,
      is_template, is_published, category
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13)
    RETURNING *`,
    [
      publicId,
      slug,
      userId,
      payload.name || 'Unnamed Agent',
      payload.description || '',
      payload.system_prompt || '',
      payload.welcome_message || '',
      JSON.stringify(payload.initial_suggestions || []),
      payload.icon_url || null,
      payload.theme || 'cosmic',
      Boolean(payload.is_template),
      Boolean(payload.is_published),
      payload.category || 'AI Assistant',
    ]
  );

  const row = result.rows[0];
  await attachSkills(row.id, payload.skill_ids || []);
  const skills = await loadSkillsForAgent(row.id);
  return rowToAgent(row, { skills, isOwner: true });
}

export async function updateAgentBySlugOrPublicId(identifier, payload, userId) {
  const existing = await getAgentBySlugOrPublicId(identifier, { viewerUserId: userId });
  if (!existing) return { error: 'Agent not found', status: 404 };
  if (!existing.is_owner) return { error: 'You are not authorized to edit this agent.', status: 403 };

  const rowRes = await query(
    'SELECT id, slug FROM agents WHERE public_id::text = $1 OR lower(slug) = lower($1) LIMIT 1',
    [identifier]
  );
  const agentDbId = rowRes.rows[0]?.id;
  if (!agentDbId) return { error: 'Agent not found', status: 404 };

  let slug = rowRes.rows[0].slug;
  if (payload.name && payload.slug) {
    slug = await ensureUniqueSlug(slugify(payload.slug), agentDbId);
  }

  const result = await query(
    `UPDATE agents SET
      name = COALESCE($2, name),
      description = COALESCE($3, description),
      system_prompt = COALESCE($4, system_prompt),
      welcome_message = COALESCE($5, welcome_message),
      initial_suggestions = COALESCE($6::jsonb, initial_suggestions),
      icon_url = COALESCE($7, icon_url),
      theme = COALESCE($8, theme),
      is_published = COALESCE($9, is_published),
      is_template = COALESCE($10, is_template),
      slug = $11,
      updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [
      agentDbId,
      payload.name,
      payload.description,
      payload.system_prompt,
      payload.welcome_message,
      payload.initial_suggestions != null ? JSON.stringify(payload.initial_suggestions) : null,
      payload.icon_url,
      payload.theme,
      payload.is_published,
      payload.is_template,
      slug,
    ]
  );

  if (payload.skill_ids) {
    await attachSkills(agentDbId, payload.skill_ids);
  }

  const skills = await loadSkillsForAgent(agentDbId);
  return { agent: rowToAgent(result.rows[0], { skills, isOwner: true }) };
}

export async function deleteAgentBySlugOrPublicId(identifier, userId) {
  const existing = await getAgentBySlugOrPublicId(identifier, { viewerUserId: userId });
  if (!existing) return { error: 'Agent not found', status: 404 };
  if (!existing.is_owner) return { error: 'Forbidden', status: 403 };
  if (existing.is_template) return { error: 'Cannot delete template agents', status: 403 };

  await query(
    'DELETE FROM agents WHERE public_id::text = $1 OR lower(slug) = lower($1)',
    [identifier]
  );
  return { ok: true };
}

export async function toggleAgentLike(identifier, userId, isLike) {
  const rowRes = await query(
    'SELECT id, like_count FROM agents WHERE public_id::text = $1 OR lower(slug) = lower($1) LIMIT 1',
    [identifier]
  );
  const row = rowRes.rows[0];
  if (!row) return null;

  if (isLike) {
    await query(
      `INSERT INTO agent_likes (agent_id, user_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [row.id, userId]
    );
  } else {
    await query('DELETE FROM agent_likes WHERE agent_id = $1 AND user_id = $2', [row.id, userId]);
  }

  const countRes = await query(
    'SELECT COUNT(*)::int AS c FROM agent_likes WHERE agent_id = $1',
    [row.id]
  );
  const likeCount = countRes.rows[0]?.c || 0;
  await query('UPDATE agents SET like_count = $2 WHERE id = $1', [row.id, likeCount]);

  const liked = await query(
    'SELECT 1 FROM agent_likes WHERE agent_id = $1 AND user_id = $2',
    [row.id, userId]
  );

  return {
    has_liked: liked.rows.length > 0,
    like_count: likeCount,
  };
}

export async function getAgentProfile(identifier) {
  const agent = await getAgentBySlugOrPublicId(identifier);
  if (!agent) return null;
  return {
    ...agent,
    profile: {
      name: agent.name,
      description: agent.description,
      icon_url: agent.icon_url,
      like_count: agent.like_count,
    },
  };
}

export async function suggestAgentFromPrompt(prompt) {
  const text = String(prompt || '').trim();
  const topic = text.slice(0, 120) || 'general assistance';
  const name = text.split(/[.!?\n]/)[0].trim().slice(0, 48) || 'Custom Assistant';

  return {
    name: name.length > 3 ? name : 'Custom Assistant',
    description: `An AI assistant specialized in: ${topic}`,
    system_prompt: `You are a helpful AI assistant. Your specialty:\n${text}\n\nBe clear, friendly, and actionable. Ask follow-up questions when needed.`,
    recommended_skill_ids: ['writing'],
    welcome_message: `Hello! I'm here to help you with ${name.toLowerCase()}.`,
    initial_suggestions: ['How can you help me?', 'Give me a quick overview', 'What should I ask first?'],
  };
}

export async function getAgentDbId(identifier) {
  const result = await query(
    'SELECT id FROM agents WHERE public_id::text = $1 OR lower(slug) = lower($1) LIMIT 1',
    [identifier]
  );
  return result.rows[0]?.id || null;
}
