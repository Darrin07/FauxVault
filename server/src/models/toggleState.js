/** Vulnerability toggle model — PostgreSQL queries replacing the in-memory mock store */
const { pool } = require('../config/db');
const MAX_ACTIVE_VULNERABILITIES = 3;

/**
 * Returns all vulnerability toggle settings.
 * @returns {Array<Object>} array of setting records
 */
async function getAllSettings() {
  const result = await pool.query(
    `SELECT module_key, module_name, is_vulnerable, updated_at
     FROM vulnerability_settings
     ORDER BY module_key`
  );
  return result.rows;
}

/**
 * Returns effective settings for a signed-in user.
 * Global defaults remain read-only; user rows override them when present.
 * @param {string} userId - the user's UUID
 * @returns {Array<Object>} merged setting records
 */
async function getUserSettings(userId) {
  const result = await pool.query(
    `SELECT v.module_key,
            v.module_name,
            COALESCE(uvs.is_vulnerable, v.is_vulnerable) AS is_vulnerable,
            v.is_vulnerable AS global_default,
            (uvs.user_id IS NOT NULL) AS has_user_override,
            COALESCE(uvs.updated_at, v.updated_at) AS updated_at
     FROM vulnerability_settings v
     LEFT JOIN user_vulnerability_settings uvs
       ON uvs.user_id = $1
      AND uvs.module_name = v.module_name
     ORDER BY v.module_key`,
    [userId]
  );
  return result.rows;
}

/**
 * Updates a single module's toggle state by module_name.
 * @param {string} module_name - the code-facing module name (e.g. 'sql_injection')
 * @param {boolean} is_vulnerable - the new toggle state
 * @returns {Object|null} the updated setting, or null if module not found
 */
async function updateSetting(module_name, is_vulnerable) {
  const result = await pool.query(
    `UPDATE vulnerability_settings
     SET is_vulnerable = $1, updated_at = CURRENT_TIMESTAMP
     WHERE module_name = $2
     RETURNING module_key, module_name, is_vulnerable, updated_at`,
    [is_vulnerable, module_name]
  );
  return result.rows[0] || null;
}

/**
 * Resets all settings to vulnerable (TRUE). Used in test teardown.
 */
async function resetSettings() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE vulnerability_settings
       SET is_vulnerable = FALSE, updated_at = CURRENT_TIMESTAMP`
    );
    await client.query('DELETE FROM user_vulnerability_settings');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Looks up a single module's toggle state by module_name.
 * @param {string} module_name - the code-facing module name
 * @returns {Object|null} the setting record, or null if not found
 */
async function getSettingByModule(module_name) {
  const result = await pool.query(
    `SELECT module_key, module_name, is_vulnerable, updated_at
     FROM vulnerability_settings
     WHERE module_name = $1`,
    [module_name]
  );
  return result.rows[0] || null;
}

/**
 * Returns the effective setting for a single module and signed-in user.
 * @param {string} userId - the user's UUID
 * @param {string} module_name - the code-facing module name
 * @returns {Object|null} merged setting record
 */
async function getUserSettingByModule(userId, module_name) {
  const result = await pool.query(
    `SELECT v.module_key,
            v.module_name,
            COALESCE(uvs.is_vulnerable, v.is_vulnerable) AS is_vulnerable,
            v.is_vulnerable AS global_default,
            (uvs.user_id IS NOT NULL) AS has_user_override,
            COALESCE(uvs.updated_at, v.updated_at) AS updated_at
     FROM vulnerability_settings v
     LEFT JOIN user_vulnerability_settings uvs
       ON uvs.user_id = $1
      AND uvs.module_name = v.module_name
     WHERE v.module_name = $2`,
    [userId, module_name]
  );
  return result.rows[0] || null;
}

/**
 * Persists a user's vulnerability setting.
 * When enabling a fourth module, the oldest active user override is turned off.
 * @param {string} userId - the user's UUID
 * @param {string} module_name - the code-facing module name
 * @param {boolean} is_vulnerable - the new toggle state
 * @returns {Object|null} updated setting payload, or null if the module is unknown
 */
async function updateUserSetting(userId, module_name, is_vulnerable) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const moduleResult = await client.query(
      `SELECT module_key, module_name, is_vulnerable, updated_at
       FROM vulnerability_settings
       WHERE module_name = $1`,
      [module_name]
    );

    if (!moduleResult.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }

    let autoDisabledModule = null;

    if (is_vulnerable) {
      const activeResult = await client.query(
        `SELECT module_name
         FROM user_vulnerability_settings
         WHERE user_id = $1
           AND is_vulnerable = TRUE
           AND module_name <> $2
         ORDER BY updated_at ASC
         FOR UPDATE`,
        [userId, module_name]
      );

      if (activeResult.rows.length >= MAX_ACTIVE_VULNERABILITIES) {
        autoDisabledModule = activeResult.rows[0].module_name;
        await client.query(
          `UPDATE user_vulnerability_settings
           SET is_vulnerable = FALSE, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $1 AND module_name = $2`,
          [userId, autoDisabledModule]
        );
      }
    }

    await client.query(
      `INSERT INTO user_vulnerability_settings (user_id, module_name, is_vulnerable, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, module_name)
       DO UPDATE SET is_vulnerable = EXCLUDED.is_vulnerable,
                     updated_at = CURRENT_TIMESTAMP`,
      [userId, module_name, is_vulnerable]
    );

    const settingsResult = await client.query(
      `SELECT v.module_key,
              v.module_name,
              COALESCE(uvs.is_vulnerable, v.is_vulnerable) AS is_vulnerable,
              v.is_vulnerable AS global_default,
              (uvs.user_id IS NOT NULL) AS has_user_override,
              COALESCE(uvs.updated_at, v.updated_at) AS updated_at
       FROM vulnerability_settings v
       LEFT JOIN user_vulnerability_settings uvs
         ON uvs.user_id = $1
        AND uvs.module_name = v.module_name
       ORDER BY v.module_key`,
      [userId]
    );

    await client.query('COMMIT');

    return {
      setting: settingsResult.rows.find((row) => row.module_name === module_name) || null,
      settings: settingsResult.rows,
      autoDisabledModule,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  MAX_ACTIVE_VULNERABILITIES,
  getAllSettings,
  getUserSettings,
  updateSetting,
  updateUserSetting,
  resetSettings,
  getSettingByModule,
  getUserSettingByModule,
};
