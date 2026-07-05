import crypto from 'crypto';
import { query } from '@/src/lib/postgres';

function hashKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

export function generateApiKey() {
  const token = crypto.randomBytes(24).toString('hex');
  return `oga_live_${token}`;
}

export async function ensureLocalAdminUser() {
  const email = process.env.INTERNAL_ADMIN_EMAIL || 'local-admin@open-generative.ai';
  const displayName = process.env.INTERNAL_ADMIN_NAME || 'Local Admin';

  const result = await query(
    `INSERT INTO users (email, display_name, role)
     VALUES ($1, $2, 'admin')
     ON CONFLICT (email)
     DO UPDATE SET display_name = EXCLUDED.display_name, role = 'admin', updated_at = now()
     RETURNING id, email, display_name, role`,
    [email, displayName]
  );

  return result.rows[0] || null;
}

export async function createInternalApiKey({ userId, keyName = 'Default Local Key' }) {
  const apiKey = generateApiKey();
  const keyPrefix = apiKey.slice(0, 14);
  const keyHash = hashKey(apiKey);

  const result = await query(
    `INSERT INTO api_keys (user_id, key_name, key_prefix, key_hash, is_active)
     VALUES ($1, $2, $3, $4, true)
     RETURNING id, user_id, key_name, key_prefix, is_active, created_at`,
    [userId, keyName, keyPrefix, keyHash]
  );

  return {
    apiKey,
    record: result.rows[0] || null,
  };
}

export async function findUserByInternalApiKey(apiKey) {
  const keyHash = hashKey(apiKey);

  const result = await query(
    `SELECT
      ak.id AS api_key_id,
      ak.key_name,
      ak.key_prefix,
      ak.user_id,
      u.email,
      u.display_name,
      u.role
     FROM api_keys ak
     LEFT JOIN users u ON u.id = ak.user_id
     WHERE ak.key_hash = $1 AND ak.is_active = true
     LIMIT 1`,
    [keyHash]
  );

  const row = result.rows[0] || null;
  if (row) {
    await query('UPDATE api_keys SET last_used_at = now() WHERE id = $1', [row.api_key_id]);
  }

  return row;
}

export async function listInternalApiKeysByUser(userId) {
  const numericUserId = Number(userId);
  if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
    throw new Error('Invalid user id');
  }

  const result = await query(
    `SELECT
      id,
      user_id,
      key_name,
      key_prefix,
      is_active,
      created_at,
      last_used_at
     FROM api_keys
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [numericUserId]
  );

  return result.rows || [];
}

export async function deactivateInternalApiKey({ keyId, userId = null }) {
  const numericKeyId = Number(keyId);
  if (!Number.isInteger(numericKeyId) || numericKeyId <= 0) {
    throw new Error('Invalid key id');
  }

  const values = [numericKeyId];
  let userFilter = '';
  if (userId !== null && userId !== undefined) {
    const numericUserId = Number(userId);
    if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
      throw new Error('Invalid user id');
    }
    values.push(numericUserId);
    userFilter = ` AND user_id = $${values.length}`;
  }

  const result = await query(
    `UPDATE api_keys
     SET is_active = false
     WHERE id = $1${userFilter}
     RETURNING id, user_id, key_name, key_prefix, is_active, created_at, last_used_at`,
    values
  );

  return result.rows[0] || null;
}
