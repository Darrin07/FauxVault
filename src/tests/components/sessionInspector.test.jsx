/**
 * Component tests: SessionInspector
 *
 * Vulnerability Module: weak_session_tokens (A07)
 *
 * What is tested:
 *  1. Renders the Session Inspector header and chip
 *  2. Shows vulnerable chip and red indicators when weak_session_tokens is enabled
 *  3. Shows hardened chip and green indicators when weak_session_tokens is disabled
 *  4. Shows cookie flag labels (HttpOnly, Secure, SameSite)
 *  5. Shows the re-login prompt when module is hardened but localStorage still has a token
 *
 * Mock strategy:
 *  - useVulnerabilities: vi.hoisted mock to control module state
 *  - document.cookie and localStorage: manipulated in tests
 *  - @mui/material: avoids importing full MUI during collection by using lw stubs
 *  - @mui/icons-material: stub icons render as <span> w/data-testid
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// MUI mocks (speeds up test collection)--------------

// renders children + key text props into the DOM
const Passthrough = ({ children, label, severity, title, ...rest }) => (
    <div data-severity={severity} data-title={title} {...rest}>
        {label && <span>{label}</span>}
        {children}
    </div>
)

vi.mock('@mui/material', () => ({
    Card: (props) => <Passthrough {...props} />,
    CardContent: (props) => <Passthrough {...props} />,
    Box: (props) => <Passthrough {...props} />,
    Typography: ({ children, ...rest }) => <span {...rest}>{children}</span>,
    Chip: ({ label }) => <span>{label}</span>,
    IconButton: (props) => <button {...props} />,
    Tooltip: ({ children }) => <>{children}</>,
    Divider: () => <hr />,
    Alert: ({ children, severity }) => <div role="alert" data-severity={severity}>{children}</div>,
}))

vi.mock('@mui/icons-material', () => ({
    Security: () => <span data-testid="icon-security" />,
    ContentCopy: () => <span data-testid="icon-copy" />,
    Visibility: () => <span data-testid="icon-visible" />,
    VisibilityOff: () => <span data-testid="icon-hidden" />,
}))

// Hook mock-------------- 

import SessionInspector from '@/components/SessionInspector'

// Mock setup--------------

const { mockUseVulnerabilities } = vi.hoisted(() => ({
    mockUseVulnerabilities: vi.fn(),
}))

vi.mock('@/hooks/useVulnerabilities', () => ({
    useVulnerabilities: mockUseVulnerabilities,
}))

// Helpers-------------- 

const VULNERABLE_STATE = {
    modules: [{ id: 'weak_session_tokens', name: 'Weak Session Tokens', enabled: true }],
    toggleModule: vi.fn(),
    isVulnerable: true,
    notification: null,
    closeNotification: vi.fn(),
}

const HARDENED_STATE = {
    modules: [{ id: 'weak_session_tokens', name: 'Weak Session Tokens', enabled: false }],
    toggleModule: vi.fn(),
    isVulnerable: false,
    notification: null,
    closeNotification: vi.fn(),
}

beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockUseVulnerabilities.mockReturnValue(HARDENED_STATE)
})

afterEach(() => {
    localStorage.clear()
})

// Tests (Rendering, Vulnerable Mode, Hardened Mode)--------------

describe('SessionInspector — renders', () => {
    it('renders the Session Inspector header', () => {
        render(<SessionInspector />)
        expect(screen.getByText('Session Inspector')).toBeInTheDocument()
    })

    it('renders all three cookie flag labels', () => {
        render(<SessionInspector />)
        expect(screen.getByText('HttpOnly')).toBeInTheDocument()
        expect(screen.getByText('Secure')).toBeInTheDocument()
        expect(screen.getByText('SameSite')).toBeInTheDocument()
    })

    it('renders document.cookie and localStorage.token labels', () => {
        render(<SessionInspector />)
        expect(screen.getByText('document.cookie')).toBeInTheDocument()
        expect(screen.getByText('localStorage.token')).toBeInTheDocument()
    })
})

describe('SessionInspector — vulnerable mode', () => {
    it('shows VULNERABLE chip when weak_session_tokens is enabled', () => {
        mockUseVulnerabilities.mockReturnValue(VULNERABLE_STATE)
        render(<SessionInspector />)
        expect(screen.getByText('VULNERABLE')).toBeInTheDocument()
    })

    it('shows insecure cookie flag values', () => {
        mockUseVulnerabilities.mockReturnValue(VULNERABLE_STATE)
        render(<SessionInspector />)
        expect(screen.getAllByText('false')[0]).toBeInTheDocument() // httpOnly: false (Secure also false)
        expect(screen.getByText('Lax')).toBeInTheDocument()  // sameSite: Lax
    })

    it('shows XSS warning text in vulnerable mode', () => {
        mockUseVulnerabilities.mockReturnValue(VULNERABLE_STATE)
        render(<SessionInspector />)
        expect(screen.getByText(/xss payload like document.cookie can steal/i)).toBeInTheDocument()
    })
})

describe('SessionInspector — hardened mode', () => {
    it('shows HARDENED chip when weak_session_tokens is disabled', () => {
        render(<SessionInspector />)
        expect(screen.getByText('HARDENED')).toBeInTheDocument()
    })

    it('shows secure cookie flag values', () => {
        render(<SessionInspector />)
        expect(screen.getAllByText('true')[0]).toBeInTheDocument()    // httpOnly: true (Secure also true)
        expect(screen.getByText('Strict')).toBeInTheDocument()  // sameSite: Strict
    })

    it('shows security confirmation text in hardened mode', () => {
        render(<SessionInspector />)
        expect(screen.getByText(/invisible to javascript/i)).toBeInTheDocument()
    })
})

describe('SessionInspector — re-login prompt', () => {
    it('shows re-login alert when hardened but localStorage still has a token', () => {
        localStorage.setItem('token', 'eyJfake.token.value')
        mockUseVulnerabilities.mockReturnValue(HARDENED_STATE)
        render(<SessionInspector />)
        expect(screen.getByText(/log out and log back in/i)).toBeInTheDocument()
    })

    it('does NOT show re-login alert when hardened and localStorage is empty', () => {
        render(<SessionInspector />)
        expect(screen.queryByText(/log out and log back in/i)).not.toBeInTheDocument()
    })
})
