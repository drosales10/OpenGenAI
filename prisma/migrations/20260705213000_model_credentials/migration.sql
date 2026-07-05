CREATE TABLE IF NOT EXISTS "model_credentials" (
    "model_key" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "credentials" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "routing_mode" TEXT NOT NULL DEFAULT 'auto',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_credentials_pkey" PRIMARY KEY ("model_key")
);

CREATE INDEX IF NOT EXISTS "model_credentials_module_idx" ON "model_credentials"("module_id");
CREATE INDEX IF NOT EXISTS "model_credentials_provider_idx" ON "model_credentials"("provider_id");
