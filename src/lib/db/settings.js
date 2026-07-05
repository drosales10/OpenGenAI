import { query } from '@/src/lib/postgres';

function isMissingTableError(error, tableName) {
  return error?.code === '42P01' && String(error?.message || '').includes(tableName);
}

export async function getSetting(settingKey) {
  try {
    const result = await query(
      'SELECT setting_key, setting_value, updated_at FROM system_settings WHERE setting_key = $1',
      [settingKey]
    );
    return result.rows[0] || null;
  } catch (error) {
    // Allow app boot before schema init; callers will fall back to defaults.
    if (isMissingTableError(error, 'system_settings')) return null;
    throw error;
  }
}

export async function upsertSetting(settingKey, settingValue) {
  const result = await query(
    `INSERT INTO system_settings (setting_key, setting_value)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (setting_key)
     DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = now()
     RETURNING setting_key, setting_value, updated_at`,
    [settingKey, JSON.stringify(settingValue)]
  );
  return result.rows[0] || null;
}

export async function isAutoApprovalEnabled() {
  const setting = await getSetting('auto_approve_jobs');
  return setting?.setting_value?.enabled !== false;
}
