import { apiFetch } from './client'

/**
 * Admin service — wraps /api/admin/* endpoints.
 * All calls require a Bearer JWT. In hardened mode the server additionally
 * enforces role='admin'; in vulnerable mode (privilege_escalation ON) any
 * authenticated user is let through.
 */

/**
 * GET /api/admin/users
 * @returns {{ users: Array<{ id, username, email, name, role, createdAt }> }}
 */
export async function listUsers() {
    return apiFetch('/admin/users')
}

/**
 * GET /api/admin/users/:id
 * @param {string} id - target user UUID
 * @returns {{ user: { id, username, email, name, role, createdAt } }}
 */
export async function getUserById(id) {
    return apiFetch(`/admin/users/${id}`)
}

/**
 * PATCH /api/admin/users/:id/role
 * @param {string} id   - target user UUID
 * @param {string} role - 'user' | 'admin'
 * @returns {{ user: { id, username, email, name, role, createdAt } }}
 */
export async function changeUserRole(id, role) {
    return apiFetch(`/admin/users/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
    })
}
