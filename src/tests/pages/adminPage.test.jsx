/**
 * Component integration tests: AdminPage
 *
 * Mocks the admin service and vulnerabilities service at the module level.
 * Requires a logged-in auth session (seeded in localStorage).
 *
 * What is tested:
 *  1. User list loading
 *    a. shows a loading spinner on mount
 *    b. renders a row for each user returned by listUsers()
 *    c. displays username, email, and role for each user
 *    d. shows an error alert when listUsers() rejects
 *
 *  2. Access control banners
 *    a. shows no access-control banner for admin users
 *    b. shows a warning banner for non-admin users when privilege_escalation is OFF
 *
 *  3. Role management
 *    a. apply button is disabled when no role change is pending
 *    b. calls changeUserRole() with the correct args on apply
 *    c. shows an error alert when changeUserRole() rejects
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/admin', () => ({
    listUsers: vi.fn(),
    changeUserRole: vi.fn(),
}))

vi.mock('@/services/vulnerabilities', () => ({
    getModules: vi.fn().mockResolvedValue([]),
    updateModule: vi.fn().mockResolvedValue({}),
}))

vi.mock('@mui/material', () => ({
    Box: ({ children }) => <div>{children}</div>,
    Typography: ({ children }) => <span>{children}</span>,
    Alert: ({ children, onClose }) => (
        <div role="alert">
            {children}
            {onClose && <button onClick={onClose}>Close</button>}
        </div>
    ),
    Card: ({ children }) => <div>{children}</div>,
    CardContent: ({ children }) => <div>{children}</div>,
    CircularProgress: ({ size }) => <div data-testid={size ? 'spinner-small' : 'loading'} />,
    Table: ({ children }) => <table>{children}</table>,
    TableBody: ({ children }) => <tbody>{children}</tbody>,
    TableCell: ({ children }) => <td>{children}</td>,
    TableHead: ({ children }) => <thead>{children}</thead>,
    TableRow: ({ children }) => <tr>{children}</tr>,
    Chip: ({ label }) => <span>{label}</span>,
    Select: ({ children, value, onChange }) => (
        <select value={value} onChange={(e) => onChange(e)}>
            {children}
        </select>
    ),
    MenuItem: ({ children, value }) => <option value={value}>{children}</option>,
    IconButton: ({ children, onClick, disabled }) => (
        <button onClick={onClick} disabled={disabled}>{children}</button>
    ),
    Tooltip: ({ children, title }) => <span title={title}>{children}</span>,
}))

vi.mock('@mui/icons-material', () => ({
    Check: () => <span>apply</span>,
}))

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { VulnerabilityProvider } from '@/context/VulnerabilityContext'
import AdminPage from '@/pages/AdminPage'
import * as adminApi from '@/services/admin'

const MOCK_USERS = [
    { id: 'u-001', username: 'admin', email: 'admin@fauxvault.com', name: 'Admin User', role: 'admin', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'u-002', username: 'regularuser', email: 'regular@example.com', name: 'Regular User', role: 'user', createdAt: '2026-01-02T00:00:00.000Z' },
]

const ADMIN_SESSION = { id: 'u-001', username: 'admin', email: 'admin@fauxvault.com', role: 'admin' }
const USER_SESSION  = { id: 'u-002', username: 'regularuser', email: 'regular@example.com', role: 'user' }

function renderPage(sessionUser = ADMIN_SESSION) {
    localStorage.setItem('token', 'test-token')
    localStorage.setItem('user', JSON.stringify(sessionUser))

    return render(
        <MemoryRouter>
            <AuthProvider>
                <VulnerabilityProvider>
                    <AdminPage />
                </VulnerabilityProvider>
            </AuthProvider>
        </MemoryRouter>
    )
}

beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    adminApi.listUsers.mockResolvedValue({ users: MOCK_USERS })
    adminApi.changeUserRole.mockResolvedValue({ user: { ...MOCK_USERS[1], role: 'admin' } })
})

// ─── User list loading ────────────────────────────────────────────────────────

describe('AdminPage — user list loading', () => {
    it('shows a loading spinner on mount', () => {
        adminApi.listUsers.mockReturnValue(new Promise(() => {})) // never resolves
        renderPage()
        expect(screen.getByTestId('loading')).toBeInTheDocument()
    })

    it('renders a row for each user returned by listUsers()', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getAllByText('admin').length).toBeGreaterThan(0)
            expect(screen.getByText('regularuser')).toBeInTheDocument()
        })
    })

    it('displays username, email, and role for each user', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('admin@fauxvault.com')).toBeInTheDocument()
            expect(screen.getByText('regular@example.com')).toBeInTheDocument()
        })
    })

    it('shows an error alert when listUsers() rejects', async () => {
        adminApi.listUsers.mockRejectedValue(new Error('Admin access required'))
        renderPage()
        expect(await screen.findByRole('alert')).toBeInTheDocument()
        expect(await screen.findByText(/admin access required/i)).toBeInTheDocument()
    })
})

// ─── Access control banners ───────────────────────────────────────────────────

describe('AdminPage — access control banners', () => {
    it('shows no access-control banner for admin users', async () => {
        renderPage(ADMIN_SESSION)
        await waitFor(() => expect(screen.queryByText(/logged in as/i)).not.toBeInTheDocument())
    })

    it('shows a warning banner for non-admin users when privilege_escalation is OFF', async () => {
        adminApi.listUsers.mockRejectedValue(new Error('Admin access required'))
        renderPage(USER_SESSION)
        expect(await screen.findByText(/blocks this page/i)).toBeInTheDocument()
    })
})

// ─── Role management ──────────────────────────────────────────────────────────

describe('AdminPage — role management', () => {
    it('apply button is disabled when no role change is pending', async () => {
        renderPage()
        await screen.findByText('regularuser')
        const applyButtons = screen.getAllByRole('button', { name: /apply/i })
        applyButtons.forEach((btn) => expect(btn).toBeDisabled())
    })

    it('calls changeUserRole() with correct args when role is changed and applied', async () => {
        const user = userEvent.setup()
        renderPage()
        await screen.findByText('regularuser')

        const selects = screen.getAllByRole('combobox')
        const regularUserSelect = selects[1] // second row = regularuser
        await user.selectOptions(regularUserSelect, 'admin')

        const applyButtons = screen.getAllByRole('button', { name: /apply/i })
        const enabledApply = applyButtons.find((btn) => !btn.disabled)
        await user.click(enabledApply)

        await waitFor(() => {
            expect(adminApi.changeUserRole).toHaveBeenCalledWith('u-002', 'admin')
        })
    })

    it('shows an error alert when changeUserRole() rejects', async () => {
        const user = userEvent.setup()
        adminApi.changeUserRole.mockRejectedValue(new Error('Failed to update role.'))
        renderPage()
        await screen.findByText('regularuser')

        const selects = screen.getAllByRole('combobox')
        await user.selectOptions(selects[1], 'admin')

        const applyButtons = screen.getAllByRole('button', { name: /apply/i })
        const enabledApply = applyButtons.find((btn) => !btn.disabled)
        await user.click(enabledApply)

        expect(await screen.findByText(/failed to update role/i)).toBeInTheDocument()
    })
})
