/**
 * API Client — centralized configuration.
 *
 * Provides a helper to fetch from the real Express API with
 * automatic JSON handling, Auth header injection, and a mock fallback toggle.
 */

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

/**
 * Helper to perform authenticated API requests with a mock fallback.
 * @param {string} endpoint - The relative path (e.g., '/auth/login')
 * @param {object} options - Standard fetch options
 * @param {function} mockCallback - Optional function to return mock data
 */
export async function apiFetch(endpoint, options = {}, mockCallback = null) {
    // Check for the toggle. Defaults to 'true' (mock) if the variable isn't found.
    const useMock = import.meta.env.VITE_USE_MOCK !== 'false';

    if (useMock && mockCallback) {
        console.log(`[API] Using Mock for: ${endpoint}`);
        return await mockCallback();
    }

    const token = localStorage.getItem('token');

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    // Guard against non-JSON responses (proxy errors, HTML 404 pages, backend down)
    const text = await response.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error(text || `Request failed with status ${response.status}`);
    }

    if (!response.ok) {
        // Bridges the gap between backend { error: { message } } and standard { message }
        throw new Error(data.error?.message || data.message || 'Something went wrong');
    }

    return data;
}

/**
 * Simulate network latency (200-500ms).
 */
export function mockDelay(ms = null) {
    const delay = ms ?? Math.floor(Math.random() * 330) + 220
    return new Promise((resolve) => setTimeout(resolve, delay))
}
