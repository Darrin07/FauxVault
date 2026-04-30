import { apiFetch } from './client'

/**  Auth service — wraps POST /auth/login, /auth/register, /auth/logout
* Works with server - authController.js:
*   POST /auth/login    body: { identifier, password }   (identifier = email OR username)
*   POST /auth/register body: { username, email, password }
*   POST /auth/logout   (stateless — client discards token)
* Note: Server's sanitizeUser() returns: { id, username, email, role }
*/


// 

/**
 * Function authenticates a user
 * @param {string} identifier - can be an email address or username
 * @param {string} password
 * @returns {{ token: string, user: { id, username, email, role } }}
 */
export async function login(identifier, password) {
    const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
    })

    if (data.token) localStorage.setItem('token', data.token)
    return data
}

/**
 * Function:  Registers a new user
 * @param {{ username: string, email: string, password: string }} fields
 * @returns {{ token: string, user: { id, username, email, role } }}
 */
export async function register({ username, email, password }) {
    const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
    })

    if (data.token) localStorage.setItem('token', data.token)
    return data
}

/**
 * Function:  Logs out the current user and removes token; client is responsible for discarding.
 */
export async function logout() {
    const data = await apiFetch('/auth/logout', { method: 'POST' })
    localStorage.removeItem('token')
    return data
}