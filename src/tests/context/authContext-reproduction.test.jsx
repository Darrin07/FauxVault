import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AuthProvider } from '@/context/AuthContext'
import { AuthContext } from '@/context/AuthContextObject'
import { useContext } from 'react'
import * as client from '@/services/client'

// Helper to render the hook with the AuthProvider wrapper
function renderAuthHook() {
    return renderHook(() => useContext(AuthContext), {
        wrapper: AuthProvider,
    })
}

describe('Issue #67 Reproduction — Auth Hydration Bug', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.restoreAllMocks()
    })

    it('should NOT call /auth/me after logout', async () => {
        // Mock apiFetch to return a user on first call (hydration)
        const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockImplementation((endpoint) => {
            if (endpoint === '/auth/me') {
                return Promise.resolve({ user: { id: 1, username: 'test' } })
            }
            return Promise.resolve({})
        })

        // Mock authService.logout
        vi.mock('@/services/auth', () => ({
            logout: vi.fn().mockResolvedValue({})
        }))

        // 1. Mount AuthProvider
        // This should trigger one hydration call to /auth/me
        const { result } = renderAuthHook()

        // Wait for hydration to finish
        // The effect runs on mount if !isAuthenticated
        await act(async () => {
            await Promise.resolve() // flush microtasks
        })

        expect(apiFetchSpy).toHaveBeenCalledWith('/auth/me')
        expect(apiFetchSpy).toHaveBeenCalledTimes(1)
        expect(result.current.isAuthenticated).toBe(true)

        // 2. Perform Logout
        await act(async () => {
            await result.current.logout()
        })

        // After logout, isAuthenticated should be false
        expect(result.current.isAuthenticated).toBe(false)

        // BUG CHECK: The hydration effect should NOT have re-fired.
        // If the bug is present, apiFetchSpy will have been called twice.
        expect(apiFetchSpy).toHaveBeenCalledTimes(1)
    })
})
