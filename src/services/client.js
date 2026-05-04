/**
 * Client-side service for HTTP config; injects the Bearer JWT on each request.
 * Handles JSON parsing and normalises the server error shapes into thrown errors.
 */

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

/**
 * Function:  Fetches a JSON endpoint with automatic auth header injection
 * @param {string} endpoint - (such as '/auth/login')
 * @param {RequestInit} options - (our fetch options)
 * @returns {Promise<any>} parsed JSON resp
 * @throws {Error} w/message on non-2xx response
 */
export async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('token')

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    }

    // If token is present, add to headers authorization key
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    })

    // Error case: non-JSON responses (proxy errors, HTML 404 pages, etc)
    const text = await response.text()
    let data
    try {
        data = JSON.parse(text)
    } catch {
        throw new Error(text || `Request failed with status ${response.status}`)
    }
    // Response does not match, adjust output of server's error to a typical/generic thrown error
    if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Something went wrong')
    }
    return data
}
