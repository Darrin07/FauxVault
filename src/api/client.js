/**
 * API Client — centralized configuration.
 *
 * Currently returns mock data with simulated latency.
 * When the real Express API is ready, update `BASE_URL`
 * and remove the mock helpers.
 */

export const BASE_URL = '/api'

/**
 * Simulate network latency (200-500ms).
 * Wrap every mock return with this to make the transition
 * to real endpoints feel natural.
 */
export function mockDelay(ms = null) {
    const delay = ms ?? Math.floor(Math.random() * 300) + 200
    return new Promise((resolve) => setTimeout(resolve, delay))
}
