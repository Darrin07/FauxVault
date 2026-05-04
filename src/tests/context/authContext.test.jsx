/**
 * Tests: src/context/AuthContext.jsx
 *
 * What is tested:
 *  getInitialState returns EMPTY_STATE when localStorage is empty
 *  getInitialState restores session when both token and user are in localStorage
 *  getInitialState handles corrupted localStorage gracefully
 *  LOGIN_SUCCESS saves user to localStorage
 *  LOGOUT clears token and user from localStorage
 *  UPDATE_PROFILE syncs updated user to localStorage
 *  setLoading(false) no longer clears errors (LOADING_DONE is separate from CLEAR_ERROR)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AuthProvider, AuthContext } from '@/context/AuthContext'
import { useContext } from 'react'

// Helper to render the hook with the AuthProvider wrapper
function renderAuthHook() {
    return renderHook(() => useContext(AuthContext), {
        wrapper: AuthProvider,
    })
}

const MOCK_USER = { id: 'u-001', username: 'test_user', email: 'test@example.com', role: 'user' }
const MOCK_TOKEN = 'mock-jwt-token'

beforeEach(() => {
    localStorage.clear()
})

describe('getInitialState — page refresh rehydration', () => {
    it('starts unauthenticated when localStorage is empty', () => {
        const { result } = renderAuthHook()
        expect(result.current.isAuthenticated).toBe(false)
        expect(result.current.user).toBeNull()
    })

    it('restores an authenticated session from localStorage', () => {
        // Simulates LOGIN_SUCCESS writes to storage
        localStorage.setItem('token', MOCK_TOKEN)
        localStorage.setItem('user', JSON.stringify(MOCK_USER))

        const { result } = renderAuthHook()

        expect(result.current.isAuthenticated).toBe(true)
        expect(result.current.user).toEqual(MOCK_USER)
        expect(result.current.token).toBe(MOCK_TOKEN)
    })

    it('starts unauthenticated if token exists but user is missing', () => {
        localStorage.setItem('token', MOCK_TOKEN)
        // Test: do NOT set 'user'

        const { result } = renderAuthHook()
        expect(result.current.isAuthenticated).toBe(false)
    })

    it('clears corrupted localStorage and starts unauthenticated', () => {
        localStorage.setItem('token', MOCK_TOKEN)
        localStorage.setItem('user', 'this-is-not-valid-json{{{{')

        const { result } = renderAuthHook()

        expect(result.current.isAuthenticated).toBe(false)
        // Test:  Corrupted keys should be removed
        expect(localStorage.getItem('token')).toBeNull()
        expect(localStorage.getItem('user')).toBeNull()
    })
})

describe('LOGIN_SUCCESS', () => {
    it('sets isAuthenticated to true', () => {
        const { result } = renderAuthHook()

        act(() => {
            result.current.login(MOCK_USER, MOCK_TOKEN)
        })

        expect(result.current.isAuthenticated).toBe(true)
    })

    it('saves the user to localStorage', () => {
        const { result } = renderAuthHook()

        act(() => {
            result.current.login(MOCK_USER, MOCK_TOKEN)
        })

        expect(JSON.parse(localStorage.getItem('user'))).toEqual(MOCK_USER)
    })
})

describe('LOGOUT', () => {
    it('sets isAuthenticated to false', () => {
        localStorage.setItem('token', MOCK_TOKEN)
        localStorage.setItem('user', JSON.stringify(MOCK_USER))

        const { result } = renderAuthHook()

        act(() => {
            result.current.logout()
        })

        expect(result.current.isAuthenticated).toBe(false)
        expect(result.current.user).toBeNull()
    })

    it('clears token and user from localStorage', () => {
        localStorage.setItem('token', MOCK_TOKEN)
        localStorage.setItem('user', JSON.stringify(MOCK_USER))

        const { result } = renderAuthHook()

        act(() => {
            result.current.logout()
        })

        expect(localStorage.getItem('token')).toBeNull()
        expect(localStorage.getItem('user')).toBeNull()
    })
})

describe('UPDATE_PROFILE', () => {
    it('updates the user object in React state', () => {
        const { result } = renderAuthHook()

        act(() => {
            result.current.login(MOCK_USER, MOCK_TOKEN)
        })
        act(() => {
            result.current.updateProfile({ email: 'updated@example.com' })
        })

        expect(result.current.user.email).toBe('updated@example.com')
    })

    it('syncs the updated user to localStorage', () => {
        const { result } = renderAuthHook()

        act(() => {
            result.current.login(MOCK_USER, MOCK_TOKEN)
        })
        act(() => {
            result.current.updateProfile({ email: 'updated@example.com' })
        })

        const stored = JSON.parse(localStorage.getItem('user'))
        expect(stored.email).toBe('updated@example.com')
    })
})

describe('setLoading — separated from error clearing', () => {
    it('setLoading(false) does NOT clear an existing error', () => {
        const { result } = renderAuthHook()

        // Test:  trigger a login failure to set an error
        act(() => {
            result.current.setError('Invalid credentials')
        })

        expect(result.current.error).toBe('Invalid credentials')

        // Check: setLoading(false) should only stop the spinner, not wipe the error
        act(() => {
            result.current.setLoading(false)
        })

        
        expect(result.current.error).toBe('Invalid credentials')
        expect(result.current.isLoading).toBe(false)
    })
})
