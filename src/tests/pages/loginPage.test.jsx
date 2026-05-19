/**
 * Component integration tests: LoginPage
 *
 * Mocks the auth service at the module level.
 * useNavigate is mocked via vi.hoisted to capture redirect targets.
 *
 * Tests:
 *  1. Form validation
 *    a. shows an error when both fields are empty on submit
 *    b. shows an error when password is missing — does not call the API
 *
 *  2. Redirect after login
 *    a. redirects to /dashboard when no prior route is captured in location state
 *    b. redirects to location.state.from when a prior route is captured
 *
 *  3. Server error handling
 *    a. shows an Alert with the server error message on login failure
 *    b. re-enables the submit button after a failed login
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import LoginPage from '@/pages/LoginPage'

// Mocks

const { mockNavigate } = vi.hoisted(() => ({
    mockNavigate: vi.fn(),
}))

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal()
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    }
})

vi.mock('@/services/auth', () => ({
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
}))

vi.mock('@mui/material', () => ({
    Box: ({ children, component, onSubmit, to }) => {
        if (component === 'form') return <form onSubmit={onSubmit}>{children}</form>
        if (component && typeof component !== 'string') return <a href={to}>{children}</a>
        return <div>{children}</div>
    },
    Typography: ({ children }) => <span>{children}</span>,
    TextField: ({ placeholder, onChange, value, type, label, inputProps }) => (
        <>
            {label && <label htmlFor={label}>{label}</label>}
            <input
                id={label}
                placeholder={placeholder}
                onChange={onChange}
                value={value}
                type={type}
                {...(inputProps || {})}
            />
        </>
    ),
    Button: ({ children, onClick, disabled, type }) => (
        <button type={type} onClick={onClick} disabled={disabled}>{children}</button>
    ),
    Alert: ({ children, severity }) => (
        <div role="alert" data-severity={severity}>{children}</div>
    ),
    InputAdornment: ({ children }) => <div>{children}</div>,
    CircularProgress: () => <div data-testid="loading" />,
}))

vi.mock('@mui/icons-material', () => ({
    Person: () => <span>user-icon</span>,
    Lock: () => <span>lock-icon</span>,
}))

import * as authService from '@/services/auth'

const MOCK_USER = { id: 'u-001', username: 'test_user', email: 'test@example.com', role: 'user' }
const MOCK_TOKEN = 'mock-jwt-token'

function renderPage(locationEntry = '/login') {
    return render(
        <MemoryRouter initialEntries={[locationEntry]}>
            <AuthProvider>
                <LoginPage />
            </AuthProvider>
        </MemoryRouter>
    )
}

beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
})

// Form validation ─────────────────────────────────────────────────────────────

describe('LoginPage — form validation', () => {
    it('shows an error when both fields are empty on submit', async () => {
        const user = userEvent.setup()
        renderPage()
        await user.click(screen.getByRole('button', { name: /log in/i }))
        expect(await screen.findByRole('alert')).toBeInTheDocument()
        expect(authService.login).not.toHaveBeenCalled()
    })

    it('shows an error when password is missing and does not call the API', async () => {
        const user = userEvent.setup()
        renderPage()
        await user.type(screen.getByLabelText(/username or email/i), 'test@example.com')
        await user.click(screen.getByRole('button', { name: /log in/i }))
        expect(await screen.findByRole('alert')).toBeInTheDocument()
        expect(authService.login).not.toHaveBeenCalled()
    })
})

// Redirect after login ────────────────────────────────────────────────────────

describe('LoginPage — redirect after login', () => {
    it('redirects to /dashboard when no prior route is captured in location state', async () => {
        const user = userEvent.setup()
        authService.login.mockResolvedValue({ user: MOCK_USER, token: MOCK_TOKEN })
        renderPage()

        await user.type(screen.getByLabelText(/username or email/i), 'test@example.com')
        await user.type(screen.getByLabelText(/password/i), 'Password123')
        await user.click(screen.getByRole('button', { name: /log in/i }))

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
        })
    })

    it('redirects to location.state.from the time a prior route is captured', async () => {
        const user = userEvent.setup()
        authService.login.mockResolvedValue({ user: MOCK_USER, token: MOCK_TOKEN })
        renderPage({ pathname: '/login', state: { from: { pathname: '/transfer' } } })

        await user.type(screen.getByLabelText(/username or email/i), 'test@example.com')
        await user.type(screen.getByLabelText(/password/i), 'Password123')
        await user.click(screen.getByRole('button', { name: /log in/i }))

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/transfer')
        })
    })
})

// Server error handling

describe('LoginPage server error handling', () => {
    it('shows an Alert with the server error message on login failure', async () => {
        const user = userEvent.setup()
        authService.login.mockRejectedValue(new Error('Invalid credentials'))
        renderPage()

        await user.type(screen.getByLabelText(/username or email/i), 'test@example.com')
        await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
        await user.click(screen.getByRole('button', { name: /log in/i }))

        expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument()
    })

    it('re-enables the submit button after a failed login', async () => {
        const user = userEvent.setup()
        authService.login.mockRejectedValue(new Error('Invalid credentials'))
        renderPage()

        await user.type(screen.getByLabelText(/username or email/i), 'test@example.com')
        await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
        await user.click(screen.getByRole('button', { name: /log in/i }))

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /log in/i })).not.toBeDisabled()
        })
    })
})