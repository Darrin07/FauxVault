/**
 * Tests: src/services/client.js
 *
 * Verifies apiFetch's X-Vulnerability-Overrides header injection.
 * The Authorization header is exercised indirectly by other service tests
 * (auth.test.js, accounts.test.js, transfers.test.js).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiFetch } from '@/services/client'
import { setActiveModuleIds } from '@/services/vulnerabilityState'

function mockFetch(body, status = 200) {
    return vi.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        text: () => Promise.resolve(JSON.stringify(body)),
    })
}

beforeEach(() => {
    setActiveModuleIds([])
    localStorage.clear()
})

afterEach(() => {
    vi.restoreAllMocks()
})

describe('apiFetch X-Vulnerability-Overrides header', () => {
    it('omits the header when no modules are active', async () => {
        vi.stubGlobal('fetch', mockFetch({}))

        await apiFetch('/settings')

        const headers = fetch.mock.calls[0][1].headers
        expect(headers).not.toHaveProperty('X-Vulnerability-Overrides')
    })

    it('joins active module IDs into a comma-separated header', async () => {
        setActiveModuleIds(['brute_force', 'sql_injection'])
        vi.stubGlobal('fetch', mockFetch({}))

        await apiFetch('/settings')

        const headers = fetch.mock.calls[0][1].headers
        expect(headers['X-Vulnerability-Overrides']).toBe('brute_force,sql_injection')
    })

    it('reads the current holder state on every call, not a snapshot', async () => {
        vi.stubGlobal('fetch', mockFetch({}))

        setActiveModuleIds(['bola'])
        await apiFetch('/first')

        setActiveModuleIds(['bola', 'xss_stored'])
        await apiFetch('/second')

        expect(fetch.mock.calls[0][1].headers['X-Vulnerability-Overrides']).toBe('bola')
        expect(fetch.mock.calls[1][1].headers['X-Vulnerability-Overrides']).toBe('bola,xss_stored')
    })

    it('coexists with the Authorization header when a token is set', async () => {
        localStorage.setItem('token', 'tok-abc')
        setActiveModuleIds(['brute_force'])
        vi.stubGlobal('fetch', mockFetch({}))

        await apiFetch('/settings')

        const headers = fetch.mock.calls[0][1].headers
        expect(headers['Authorization']).toBe('Bearer tok-abc')
        expect(headers['X-Vulnerability-Overrides']).toBe('brute_force')
    })
})
