import { getPool } from '@/src/lib/postgres';
import { seedAgentCatalog } from '@/src/lib/db/agents';

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS system_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT UNIQUE,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS api_keys (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    key_name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ
  )`,
  `CREATE TABLE IF NOT EXISTS jobs (
    id BIGSERIAL PRIMARY KEY,
    request_id TEXT,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    approval_status TEXT NOT NULL DEFAULT 'approved',
    auto_approved BOOLEAN NOT NULL DEFAULT true,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
  )`,
  `CREATE TABLE IF NOT EXISTS job_events (
    id BIGSERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS model_registry (
    id BIGSERIAL PRIMARY KEY,
    model_key TEXT NOT NULL UNIQUE,
    provider TEXT NOT NULL,
    model_kind TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS provider_request_logs (
    id BIGSERIAL PRIMARY KEY,
    provider TEXT NOT NULL,
    route_group TEXT NOT NULL,
    method TEXT NOT NULL,
    target_path TEXT NOT NULL,
    project_id TEXT,
    status_code INTEGER,
    duration_ms INTEGER,
    auth_mode TEXT NOT NULL,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    request_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    actor_email TEXT,
    action TEXT NOT NULL,
    target_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    target_type TEXT,
    target_id TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS provider_credentials (
    id BIGSERIAL PRIMARY KEY,
    module_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(module_id, provider_id)
  )`,
  `CREATE INDEX IF NOT EXISTS provider_credentials_module_idx ON provider_credentials(module_id)`,
  `CREATE TABLE IF NOT EXISTS model_credentials (
    model_key TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL,
    module_id TEXT NOT NULL,
    credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
    routing_mode TEXT NOT NULL DEFAULT 'auto',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS model_credentials_module_idx ON model_credentials(module_id)`,
  `CREATE INDEX IF NOT EXISTS model_credentials_provider_idx ON model_credentials(provider_id)`,
  `CREATE TABLE IF NOT EXISTS agent_skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS agents (
    id BIGSERIAL PRIMARY KEY,
    public_id UUID NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    system_prompt TEXT NOT NULL DEFAULT '',
    welcome_message TEXT,
    initial_suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
    icon_url TEXT,
    theme TEXT NOT NULL DEFAULT 'cosmic',
    is_template BOOLEAN NOT NULL DEFAULT false,
    is_published BOOLEAN NOT NULL DEFAULT false,
    category TEXT,
    like_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS agents_user_idx ON agents(user_id)`,
  `CREATE INDEX IF NOT EXISTS agents_template_published_idx ON agents(is_template, is_published)`,
  `CREATE TABLE IF NOT EXISTS agent_skill_links (
    agent_id BIGINT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    skill_id TEXT NOT NULL REFERENCES agent_skills(id) ON DELETE CASCADE,
    PRIMARY KEY (agent_id, skill_id)
  )`,
  `CREATE TABLE IF NOT EXISTS agent_conversations (
    id UUID PRIMARY KEY,
    agent_id BIGINT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    title TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS agent_conversations_user_idx ON agent_conversations(user_id)`,
  `CREATE TABLE IF NOT EXISTS agent_messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS agent_messages_conversation_idx ON agent_messages(conversation_id)`,
  `CREATE TABLE IF NOT EXISTS agent_likes (
    agent_id BIGINT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (agent_id, user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS admin_audit_logs_created_idx ON admin_audit_logs(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS admin_audit_logs_action_created_idx ON admin_audit_logs(action, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS provider_request_logs_provider_created_idx ON provider_request_logs(provider, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS provider_request_logs_project_created_idx ON provider_request_logs(project_id, created_at DESC) WHERE project_id IS NOT NULL`,
  `ALTER TABLE provider_request_logs ADD COLUMN IF NOT EXISTS project_id TEXT`,
  `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS request_id TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS jobs_request_id_unique_idx ON jobs(request_id) WHERE request_id IS NOT NULL`,
];

const DEFAULT_SETTINGS = [
  ['auto_approve_jobs', { enabled: true }],
  ['default_job_status', { value: 'approved' }],
  ['provider_quota_policy', {
    enabled: false,
    daily_global_limit: 5000,
    daily_user_limit: 500,
    daily_project_limit: 1200,
    minute_global_limit: 300,
    minute_user_limit: 60,
    minute_project_limit: 120,
    route_overrides: {},
  }],
];

export async function bootstrapDatabase() {
  const results = [];
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    for (const statement of SCHEMA_STATEMENTS) {
      await client.query(statement);
      results.push(statement);
    }

    for (const [settingKey, settingValue] of DEFAULT_SETTINGS) {
      await client.query(
        `INSERT INTO system_settings (setting_key, setting_value)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (setting_key)
         DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = now()`,
        [settingKey, JSON.stringify(settingValue)]
      );
    }

    await client.query('COMMIT');

    await seedAgentCatalog();

    return { ok: true, statements: results.length, settings: DEFAULT_SETTINGS.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
