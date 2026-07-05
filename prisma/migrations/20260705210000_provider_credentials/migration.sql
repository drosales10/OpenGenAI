-- CreateTable
CREATE TABLE IF NOT EXISTS "provider_credentials" (
    "id" BIGSERIAL NOT NULL,
    "module_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "credentials" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "provider_credentials_module_id_provider_id_key" ON "provider_credentials"("module_id", "provider_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "provider_credentials_module_idx" ON "provider_credentials"("module_id");
