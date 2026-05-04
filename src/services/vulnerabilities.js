import { apiFetch } from './client'

/**
 * Vulnerabilities service — wraps GET /settings and POST /settings
 * Work with: server - settingsController.js
 *   GET  /settings       Array: { module_key, module_name, is_vulnerable, updated_at }
 *   POST /settings       body: { module_name, is_vulnerable }
 *                        → { module_key, module_name, is_vulnerable, updated_at }
 * 
 * NOTE: No auth required on these endpoints - panel is purposely publicly accessible.
 */

/**
 * GET /api/settings
 * Returns all vulnerability module toggle states.
 * @returns {Array<{ module_key, module_name, is_vulnerable, updated_at }>}
 */

export async function getModules() {
    return await apiFetch('/settings')
}

/**
 * POST /api/settings
 * Function: Flips the specific vulnerability module between vulnerable and hardened using boolean
 * @param {string} moduleId - the module_name value
 * @param {boolean} enabled - true = vulnerable, false = hardened
 * @returns {{ module_key, module_name, is_vulnerable, updated_at }}
 */

export async function toggleModule(moduleId, enabled) {
    return await apiFetch('/settings', {
        method: 'POST',
        body: JSON.stringify({ module_name: moduleId, is_vulnerable: enabled }),
    })
}
