import { query } from '@/src/lib/postgres';

const ALLOWED_ROLES = new Set(['admin', 'user']);

function normalizeRole(role) {
  const normalized = String(role || '').trim().toLowerCase();
  return ALLOWED_ROLES.has(normalized) ? normalized : 'user';
}

function isMissingTableError(error, tableName) {
  return error?.code === '42P01' && String(error?.message || '').includes(tableName);
}

export async function listUsers() {
  try {
    const result = await query(
      `SELECT
        u.id,
        u.email,
        u.display_name,
        u.role,
        u.created_at,
        u.updated_at,
        COUNT(ak.id)::int AS api_keys_total,
        COUNT(*) FILTER (WHERE ak.is_active = true)::int AS api_keys_active,
        MAX(ak.last_used_at) AS last_key_used_at
       FROM users u
       LEFT JOIN api_keys ak ON ak.user_id = u.id
       GROUP BY u.id
       ORDER BY u.id DESC`
    );

    return result.rows || [];
  } catch (error) {
    if (isMissingTableError(error, 'users') || isMissingTableError(error, 'api_keys')) {
      return [];
    }
    throw error;
  }
}

export async function upsertUser({ email, displayName, role = 'user' }) {
  const trimmedEmail = String(email || '').trim().toLowerCase();
  if (!trimmedEmail) {
    throw new Error('Email is required');
  }

  const result = await query(
    `INSERT INTO users (email, display_name, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (email)
     DO UPDATE SET
       display_name = EXCLUDED.display_name,
       role = EXCLUDED.role,
       updated_at = now()
     RETURNING id, email, display_name, role, created_at, updated_at`,
    [trimmedEmail, String(displayName || '').trim() || null, normalizeRole(role)]
  );

  return result.rows[0] || null;
}

export async function updateUser({ id, displayName, role }) {
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('Invalid user id');
  }

  const fields = [];
  const values = [];

  if (displayName !== undefined) {
    values.push(String(displayName || '').trim() || null);
    fields.push(`display_name = $${values.length}`);
  }

  if (role !== undefined) {
    values.push(normalizeRole(role));
    fields.push(`role = $${values.length}`);
  }

  if (!fields.length) {
    throw new Error('No user changes provided');
  }

  values.push(userId);
  const result = await query(
    `UPDATE users
     SET ${fields.join(', ')}, updated_at = now()
     WHERE id = $${values.length}
     RETURNING id, email, display_name, role, created_at, updated_at`,
    values
  );

  return result.rows[0] || null;
}
