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
