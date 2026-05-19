/**
 * Component tests: StatusBar
 * 
 * StatusBar is purely for user reference.  It reads isVulnerable from VulnerabilityContext
 * (in useVulnerabilities) and renders either "Hardened" (green banner) or "Vulnerable" (red)
 * 
 *  *  Mock Strategy:
 *      1. @mui/material: avoids importing full MUI during collecton using lw stubs
 *      2. @mui/icons-material: stub icon renders as <span>
 *      3. useVulnerabilities is vi.hoisted mock to control module state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

//  MUI mocks--------------

vi.mock('@mui/material', () => ({
    Box: ({ children, role, ...rest }) => <div role={role} {...rest}>{children}</div>,
    Typography: ({ children }) => <span>{children}</span>,
}))

vi.mock('@mui/icons-material', () => ({
    ShieldOutlined: () => <span data-testid="icon-shield-check" />,
    GppBadOutlined: () => <span data-testid="icon-shield-alert" />,
}))

// Hook mock--------------
import StatusBar from '../../components/StatusBar'

// Set-up--------------

const { mockUseVulnerabilities } = vi.hoisted(() => ({
    mockUseVulnerabilities: vi.fn(),
}))

vi.mock('../../hooks/useVulnerabilities', () => ({
    useVulnerabilities: mockUseVulnerabilities,
}))

beforeEach(() => {
    vi.clearAllMocks()
})

// Vulnerable State--------------

describe('StatusBar — vulnerable state (isVulnerable: true)', () => {
    beforeEach(() => {
        mockUseVulnerabilities.mockReturnValue({ isVulnerable: true })
    })

    it('renders a status landmark', () => {
        render(<StatusBar />)
        expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('shows the "vulnerable" message', () => {
        render(<StatusBar />)
        expect(screen.getByRole('status')).toHaveTextContent(
            /this application is vulnerable/i
        )
    })

    it('does not show the hardened message', () => {
        render(<StatusBar />)
        expect(screen.getByRole('status')).not.toHaveTextContent(
            /all modules hardened/i
        )
    })
})

// Hardened State Tests -------------

describe('StatusBar — hardened state (isVulnerable: false)', () => {
    beforeEach(() => {
        mockUseVulnerabilities.mockReturnValue({ isVulnerable: false })
    })

    it('shows the "all modules hardened" message', () => {
        render(<StatusBar />)
        expect(screen.getByRole('status')).toHaveTextContent(
            /all modules hardened/i
        )
    })

    it('does not show the vulnerable message', () => {
        render(<StatusBar />)
        expect(screen.getByRole('status')).not.toHaveTextContent(
            /this application is vulnerable/i
        )
    })
})