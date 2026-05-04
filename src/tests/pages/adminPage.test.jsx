/**
 * Component integration tests: AdminPage
 *
 * Mocks the users service at the module level.
 * Requires a logged-in auth session (seeded in localStorage) because the
 * page reads user.username from AuthContext for the read-only panel.
 *
 * What is tested:
 *  1. Profile loading on mount
 *    a. calls getProfile() on mount
 *    b. populates the name field from the profile response
 *    c. populates the email field from the profile response
 *    d. shows the account number from the profile response
 *    e. shows '—' when accountNumber is not returned by the server
 *    f. does NOT show 'undefined' anywhere on the page
 *
 *  2. API contract
 *    a. calls updateProfile() with { name, email } on submit
 *    b. does NOT send firstName, lastName, or address in the payload
 *
 *  3. Success handling
 *    a. shows a success Alert after profile is saved
 *    b. re-enables the Save button after success
 *
 *  4. Error handling
 *    a. shows an error Alert (not just console.error) when save fails
 *    b. error Alert is dismissible via the X button
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('@/services/users', () => ({
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
}))

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import AdminPage from '@/pages/AdminPage'


import * as usersApi from '@/services/users'

const MOCK_USER = {
    id: 'u-001',
    username: 'test_user',
    email: 'test@example.com',
    role: 'user',
}

const MOCK_PROFILE = {
    id: 'u-001',
    username: 'test_user',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    accountNumber: 'FAUX-TEST123',
    createdAt: '2026-01-01T00:00:00.000Z',
}

function renderPage() {
    return render(
        <MemoryRouter>
            <AuthProvider>
                <AdminPage />
            </AuthProvider>
        </MemoryRouter>
    )
}

beforeEach(() => {
    localStorage.clear()
    // Seed a logged-in session so AuthContext has a user for the read-only panel
    localStorage.setItem('token', 'test-token')
    localStorage.setItem('user', JSON.stringify(MOCK_USER))
    vi.clearAllMocks()

    // Default: getProfile succeeds with mock data
    usersApi.getProfile.mockResolvedValue({ user: MOCK_PROFILE })
    // Default: updateProfile succeeds
    usersApi.updateProfile.mockResolvedValue({ user: { ...MOCK_PROFILE, name: 'Updated Name' } })
})

describe('AdminPage — profile loading on mount', () => {
    it('calls getProfile() on mount', async () => {
        renderPage()
        await waitFor(() => {
            expect(usersApi.getProfile).toHaveBeenCalledTimes(1)
        })
    })

    it('populates the name field from the profile response', async () => {
        renderPage()
        // Wait for getProfile to resolve and form to be seeded
        const nameField = await screen.findByLabelText(/display name/i)
        await waitFor(() => {
            expect(nameField).toHaveValue('Test User')
        })
    })

    it('populates the email field from the profile response', async () => {
        renderPage()
        const emailField = await screen.findByLabelText(/email address/i)
        await waitFor(() => {
            expect(emailField).toHaveValue('test@example.com')
        })
    })

    it('shows the account number from the profile response', async () => {
        renderPage()
        expect(await screen.findByText(/#FAUX-TEST123/i)).toBeInTheDocument()
    })

    it('shows — when accountNumber is not returned by the server', async () => {
        usersApi.getProfile.mockResolvedValue({
            user: { ...MOCK_PROFILE, accountNumber: undefined },
        })
        renderPage()
        expect(await screen.findByText('—')).toBeInTheDocument()
    })

    it('does NOT show undefined anywhere on the page', async () => {
        renderPage()
        await screen.findByLabelText(/display name/i)
        await waitFor(() => {
            expect(document.body.textContent).not.toContain('undefined')
        })
    })
})

// ─── API contract ──────────────────────────────────────────────────────────────

describe('AdminPage — API contract', () => {
    it('calls updateProfile() with { name, email } on submit', async () => {
        const user = userEvent.setup()
        renderPage()

        // Wait for form to be seeded from getProfile
        await screen.findByDisplayValue('Test User')

        // Clear name field and type a new value
        await user.clear(screen.getByLabelText(/display name/i))
        await user.type(screen.getByLabelText(/display name/i), 'New Name')
        await user.click(screen.getByRole('button', { name: /save changes/i }))

        await waitFor(() => {
            expect(usersApi.updateProfile).toHaveBeenCalledWith({
                name: 'New Name',
                email: 'test@example.com',
            })
        })
    })

    it('does NOT send firstName, lastName, or address in the payload', async () => {
        const user = userEvent.setup()
        renderPage()

        await screen.findByDisplayValue('Test User')
        await user.click(screen.getByRole('button', { name: /save changes/i }))

        await waitFor(() => {
            const payload = usersApi.updateProfile.mock.calls[0][0]
            expect(payload).not.toHaveProperty('firstName')
            expect(payload).not.toHaveProperty('lastName')
            expect(payload).not.toHaveProperty('address')
        })
    })
})

// Success handling 

describe('AdminPage — success handling', () => {
    it('shows a success Alert after the profile is saved', async () => {
        const user = userEvent.setup()
        renderPage()

        await screen.findByDisplayValue('Test User')
        await user.click(screen.getByRole('button', { name: /save changes/i }))

        expect(await screen.findByText(/profile updated successfully/i)).toBeInTheDocument()
    })

    it('re-enables the Save button after a successful save', async () => {
        const user = userEvent.setup()
        renderPage()

        await screen.findByDisplayValue('Test User')
        await user.click(screen.getByRole('button', { name: /save changes/i }))

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled()
        })
    })
})

// Error handling 

describe('AdminPage — error handling', () => {
    it('shows an error Alert when the save fails — not just console.error', async () => {
        const user = userEvent.setup()
        usersApi.updateProfile.mockRejectedValue(new Error('Email already in use'))

        renderPage()
        await screen.findByDisplayValue('Test User')
        await user.click(screen.getByRole('button', { name: /save changes/i }))

        // Error appear on page
        expect(await screen.findByText(/email already in use/i)).toBeInTheDocument()
    })

    it('dismisses the error Alert when the X button is clicked', async () => {
        const user = userEvent.setup()
        usersApi.updateProfile.mockRejectedValue(new Error('Email already in use'))

        renderPage()
        await screen.findByDisplayValue('Test User')
        await user.click(screen.getByRole('button', { name: /save changes/i }))

        await screen.findByText(/email already in use/i)

        await user.click(screen.getByRole('button', { name: /close/i }))

        await waitFor(() => {
            expect(screen.queryByText(/email already in use/i)).not.toBeInTheDocument()
        })
    })
})
