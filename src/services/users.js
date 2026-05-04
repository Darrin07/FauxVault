import { apiFetch } from './client'

/**
 * Users service: GET /users/profile and PUT /users/profile
 * Work with: server - userController.js
 *   GET /users/profile → { user: { id, username, email, name, role, accountNumber, createdAt } }
 *   PUT /users/profile   body: { name?, email? }
 *                      → { user: { id, username, email, name, role, accountNumber, createdAt } }
 * 
 * NOTE: Both require a Bearer JWT (injected automatically by apiFetch).
 */


/**
 * GET /api/users/profile
 * Function:  Returns the full profile for the user
 * @returns {{ user: { id, username, email, name, role, accountNumber, createdAt } }}
 */
export async function getProfile() {
    return await apiFetch('/users/profile')
}

/**
 * PUT /api/users/profile
 * Function:  Updates user profile
 * @param {{ name?: string, email?: string }} data
 * @returns {{ user: { id, username, email, name, role, accountNumber, createdAt } }}
 */

export async function updateProfile(data) {
    return await apiFetch('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
    })
}
