import { apiFetch } from './client'

/**
 * Vulnerabilities service — wraps GET /settings
 * Work with: server - settingsController.js
 *   GET  /settings       Array: { module_key, module_name, is_vulnerable, updated_at }
 * 
 * NOTE: GET /api/settings seeds local client state only. Toggle flips are local-only in PR#2.
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
 * GET /api/users/me/vulnerability-settings
 * Returns the merged effective vulnerability toggle state for the authenticated user:
 * per-user override when present, otherwise the global default. Ordered by module_key.
 * @returns {Array<{ module_key, module_name, is_vulnerable, global_default, has_user_override, updated_at }>}
 */
export async function getUserModules() {
    return await apiFetch('/users/me/vulnerability-settings')
}

/**
 * PUT /api/users/me/vulnerability-settings
 * Persists a single module toggle for the authenticated user.
 * @param {string} module_name - e.g. 'privilege_escalation'
 * @param {boolean} is_vulnerable
 */
export async function updateModule(module_name, is_vulnerable) {
    return await apiFetch('/users/me/vulnerability-settings', {
        method: 'PUT',
        body: JSON.stringify({ module_name, is_vulnerable }),
    })
}
