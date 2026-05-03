/**
 * Component integration tests: RegisterPage
 *
 * Mocks the auth service at the module level
 * 
 * What is tested:
 *  1. Form fields
 *    a. renders Username field, not Name or Full Name
 *    b. renders password hint for minimum 8 characters
 *
 *  2. Client-side validation
 *    a. shows error when username is empty
 *    b. shows error when username contains invalid characters
 *    c. shows error when password is fewer than 8 characters
 *    d. shows error when passwords do not match
 *    e. does NOT call the API when validation fails
 *
 *  3. API contract
 *    a. calls register() with { username, email, password }
 *    b. does NOT send 'name' in the request body
 *
 *  4. Server error handling
 *    a. shows an Alert with the server error message on failure
 *    b. does NOT crash or leave the button permanently disabled
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import RegisterPage from '@/pages/RegisterPage'

// Mock the auth service — does not test full service
vi.mock('@/services/auth', () => ({
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
}))

import * as authService from '@/services/auth'

function renderPage() {
    return render(
        <MemoryRouter>
            <AuthProvider>
                <RegisterPage />
            </AuthProvider>
        </MemoryRouter>
    )
}

// Fills all four fields with valid values
async function fillValidForm(user) {
    await user.type(screen.getByLabelText(/username/i), 'john_doe')
    await user.type(screen.getByLabelText(/^email$/i), 'john@example.com')
    await user.type(screen.getByLabelText(/^password$/i, { selector: 'input' }), 'SecurePass1')
    await user.type(screen.getByLabelText(/confirm password/i, { selector: 'input' }), 'SecurePass1')
}

beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
})

// Test Form Fields

describe('RegisterPage — form fields', () => {
    it('renders a Username field, not a Name or Full Name field', () => {
        renderPage()
        expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
        expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument()
        expect(screen.queryByLabelText(/^name$/i)).not.toBeInTheDocument()
    })

    it('shows minimum 8 characters as the password hint', () => {
        renderPage()
        // Check placeholder text
        expect(screen.getByPlaceholderText(/minimum 8/i)).toBeInTheDocument()
    })
})

// Client-side Validation tests

describe('RegisterPage — client-side validation', () => {
    it('shows a username error when the form is submitted with no username', async () => {
        const user = userEvent.setup()
        renderPage()
        await user.click(screen.getByRole('button', { name: /create account/i }))
        expect(await screen.findByText(/username is required/i)).toBeInTheDocument()
    })

    it('shows a character error when username contains a space', async () => {
        const user = userEvent.setup()
        renderPage()
        await user.type(screen.getByLabelText(/username/i), 'john doe')
        await user.click(screen.getByRole('button', { name: /create account/i }))
        expect(await screen.findByText(/letters, numbers, and underscores/i)).toBeInTheDocument()
    })

    it('shows a length error when username is fewer than 3 characters', async () => {
        const user = userEvent.setup()
        renderPage()
        await user.type(screen.getByLabelText(/username/i), 'ab')
        await user.click(screen.getByRole('button', { name: /create account/i }))
        expect(await screen.findByText(/at least 3 characters/i)).toBeInTheDocument()
    })

    it('shows a password error when password is fewer than 8 characters', async () => {
        const user = userEvent.setup()
        renderPage()
        await user.type(screen.getByLabelText(/username/i), 'john_doe')
        await user.type(screen.getByLabelText(/^email$/i), 'john@example.com')
        await user.type(screen.getByLabelText(/^password$/i, { selector: 'input' }), 'short')
        await user.type(screen.getByLabelText(/confirm password/i, { selector: 'input' }), 'short')
        await user.click(screen.getByRole('button', { name: /create account/i }))
        expect(await screen.findByText(/minimum 8/i)).toBeInTheDocument()
    })

    it('shows a mismatch error when passwords do not match', async () => {
        const user = userEvent.setup()
        renderPage()
        await user.type(screen.getByLabelText(/username/i), 'john_doe')
        await user.type(screen.getByLabelText(/^email$/i), 'john@example.com')
        await user.type(screen.getByLabelText(/^password$/i, { selector: 'input' }), 'SecurePass1')
        await user.type(screen.getByLabelText(/confirm password/i, { selector: 'input' }), 'DifferentPass1')
        await user.click(screen.getByRole('button', { name: /create account/i }))
        expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument()
    })

    it('does NOT call the auth service when validation fails', async () => {
        const user = userEvent.setup()
        renderPage()
        // no info in fields
        await user.click(screen.getByRole('button', { name: /create account/i }))
        await screen.findByText(/username is required/i)
        expect(authService.register).not.toHaveBeenCalled()
    })
})

// API tests

describe('RegisterPage — API contract', () => {
    it('calls register() with username, email, and password on valid submit', async () => {
        const user = userEvent.setup()
        authService.register.mockResolvedValue({
            token: 'test-token',
            user: { id: 'u1', username: 'john_doe', email: 'john@example.com', role: 'user' },
        })

        renderPage()
        await fillValidForm(user)
        await user.click(screen.getByRole('button', { name: /create account/i }))

        await waitFor(() => {
            expect(authService.register).toHaveBeenCalledWith({
                username: 'john_doe',
                email: 'john@example.com',
                password: 'SecurePass1',
            })
        })
    })

    it('does NOT send name in the request body', async () => {
        const user = userEvent.setup()
        authService.register.mockResolvedValue({
            token: 'test-token',
            user: { id: 'u1', username: 'john_doe', email: 'john@example.com', role: 'user' },
        })

        renderPage()
        await fillValidForm(user)
        await user.click(screen.getByRole('button', { name: /create account/i }))

        await waitFor(() => {
            const payload = authService.register.mock.calls[0][0]
            expect(payload).not.toHaveProperty('name')
        })
    })
})

// server Error handling tests

describe('RegisterPage — server error handling', () => {
    it('shows an Alert with the server message when registration fails', async () => {
        const user = userEvent.setup()
        authService.register.mockRejectedValue(new Error('Email already registered'))

        renderPage()
        await fillValidForm(user)
        await user.click(screen.getByRole('button', { name: /create account/i }))

        expect(await screen.findByText(/email already registered/i)).toBeInTheDocument()
    })

    it('re-enables the submit button after a failed registration', async () => {
        const user = userEvent.setup()
        authService.register.mockRejectedValue(new Error('Server error'))

        renderPage()
        await fillValidForm(user)
        await user.click(screen.getByRole('button', { name: /create account/i }))

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /create account/i })).not.toBeDisabled()
        })
    })
})
