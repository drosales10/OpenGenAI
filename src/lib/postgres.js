import { Pool } from 'pg';

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to connect to PostgreSQL.');
  }

  return new Pool({
    connectionString,
    max: Number(process.env.POSTGRES_POOL_MAX || 10),
    idleTimeoutMillis: 30_000,
  });
}

function getOrCreatePool() {
  if (globalThis.__OPEN_GENERATIVE_AI_PG_POOL__) {
    return globalThis.__OPEN_GENERATIVE_AI_PG_POOL__;
  }

  const pool = createPool();
  if (process.env.NODE_ENV !== 'production') {
    globalThis.__OPEN_GENERATIVE_AI_PG_POOL__ = pool;
  }
  return pool;
}

export async function query(text, values) {
  return getOrCreatePool().query(text, values);
}

export async function getDatabaseHealth() {
  const result = await getOrCreatePool().query('SELECT current_database() AS database_name, current_schema() AS schema_name, now() AS server_time');
  return result.rows[0] || null;
}

export function getPool() {
  return getOrCreatePool();
}
