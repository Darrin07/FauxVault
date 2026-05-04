/**
 * Tests: src/services/auth.js
 * Verify the correct HTTP contract is sent to the server.
 * Uses vi.stubGlobal for mock fetch
 *
 * Tested in this file:
 *  login() sends { identifier, password }, not { email }
 *  register() sends { username, email, password }, not { name }
 *  login() stores token in localStorage on success
 *  logout() removes token from localStorage
 *  login() throws a readable error on 401
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as authService from '@/services/auth'

// Builds our mockFetch
function mockFetch(body, status = 200) {
    return vi.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        text: () => Promise.resolve(JSON.stringify(body)),
    })
}

beforeEach(() => {
    localStorage.clear()
})

afterEach(() => {
    vi.restoreAllMocks()
})

describe('auth.login()', () => {
    it('sends identifier and password in the request body', async () => {
        vi.stubGlobal('fetch', mockFetch({ token: 'tok-123', user: { id: 'u1', username: 'test_user', email: 'test@example.com', role: 'user' } }))

        await authService.login('test_user', 'Password123')

        const [url, options] = fetch.mock.calls[0]
        const body = JSON.parse(options.body)

        expect(url).toContain('/auth/login')
        expect(body).toHaveProperty('identifier', 'test_user')
        expect(body).toHaveProperty('password', 'Password123')
        // Should not send 'email' as the field name
        expect(body).not.toHaveProperty('email')
    })

    it('accepts an email address as the identifier', async () => {
        vi.stubGlobal('fetch', mockFetch({ token: 'tok-123', user: { id: 'u1', username: 'test_user', email: 'test@example.com', role: 'user' } }))

        await authService.login('test@example.com', 'Password123')

        const body = JSON.parse(fetch.mock.calls[0][1].body)
        expect(body.identifier).toBe('test@example.com')
    })

    it('stores token in localStorage after successful login', async () => {
        vi.stubGlobal('fetch', mockFetch({ token: 'tok-abc', user: { id: 'u1', username: 'test_user', email: 'test@example.com', role: 'user' } }))

        await authService.login('test_user', 'Password123')

        expect(localStorage.getItem('token')).toBe('tok-abc')
    })

    it('throws error with the server message on login failure', async () => {
        vi.stubGlobal('fetch', mockFetch({ message: 'Invalid credentials' }, 401))

        await expect(authService.login('test_user', 'wrong')).rejects.toThrow('Invalid credentials')
    })
})

describe('auth.register()', () => {
    it('sends username, email, and password (not name)', async () => {
        vi.stubGlobal('fetch', mockFetch({ token: 'tok-new', user: { id: 'u2', username: 'new_user', email: 'new@example.com', role: 'user' } }))

        await authService.register({ username: 'new_user', email: 'new@example.com', password: 'SecurePass1' })

        const body = JSON.parse(fetch.mock.calls[0][1].body)

        expect(body).toHaveProperty('username', 'new_user')
        expect(body).toHaveProperty('email', 'new@example.com')
        expect(body).toHaveProperty('password', 'SecurePass1')
        // Should not send 'name'
        expect(body).not.toHaveProperty('name')
    })

    it('stores the token in localStorage after successful registration', async () => {
        vi.stubGlobal('fetch', mockFetch({ token: 'tok-new', user: { id: 'u2', username: 'new_user', email: 'new@example.com', role: 'user' } }))

        await authService.register({ username: 'new_user', email: 'new@example.com', password: 'SecurePass1' })

        expect(localStorage.getItem('token')).toBe('tok-new')
    })
})

describe('auth.logout()', () => {
    it('removes the token from localStorage on logout', async () => {
        localStorage.setItem('token', 'existing-token')
        vi.stubGlobal('fetch', mockFetch({ message: 'Logged out' }))

        await authService.logout()

        expect(localStorage.getItem('token')).toBeNull()
    })
})
