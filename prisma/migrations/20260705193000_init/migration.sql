CREATE TABLE IF NOT EXISTS system_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS jobs (
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
);

CREATE TABLE IF NOT EXISTS job_events (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS model_registry (
  id BIGSERIAL PRIMARY KEY,
  model_key TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  model_kind TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_request_logs (
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
);

CREATE INDEX IF NOT EXISTS provider_request_logs_provider_created_idx
  ON provider_request_logs(provider, created_at DESC);

CREATE INDEX IF NOT EXISTS provider_request_logs_project_created_idx
  ON provider_request_logs(project_id, created_at DESC)
  WHERE project_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS jobs_request_id_unique_idx
  ON jobs(request_id)
  WHERE request_id IS NOT NULL;

INSERT INTO system_settings (setting_key, setting_value)
VALUES
  ('auto_approve_jobs', '{"enabled": true}'::jsonb),
  ('default_job_status', '{"value": "approved"}'::jsonb),
  ('provider_quota_policy', '{"enabled": false, "daily_global_limit": 5000, "daily_user_limit": 500, "daily_project_limit": 1200, "minute_global_limit": 300, "minute_user_limit": 60, "minute_project_limit": 120, "route_overrides": {}}'::jsonb)
ON CONFLICT (setting_key)
DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = now();
