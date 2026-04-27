/** Vulnerability toggle model — PostgreSQL queries replacing the in-memory mock store */
const { pool } = require('../config/db');

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
  await pool.query(
    'UPDATE vulnerability_settings SET is_vulnerable = TRUE, updated_at = CURRENT_TIMESTAMP'
  );
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

module.exports = { getAllSettings, updateSetting, resetSettings, getSettingByModule };
