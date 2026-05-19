/**
 * Component tests: PhishingEmailDialog
 *
 * Tests For:
 *      1. Rendering
 *        a. renders dialog content when open=true
 *        b. renders nothing when open=false
 *      2. Interactions
 *        a. clicking the review link calls onClickLink
 *        b. clicking the Close button calls onClose
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PhishingEmailDialog from '../../components/PhishingEmailDialog'

// Full MUI mock — avoids bundling real @mui/material during collect.
vi.mock('@mui/material', () => ({
    Dialog: ({ open, children, id }) =>
        open ? <div id={id} role="dialog">{children}</div> : null,
    DialogTitle: ({ children }) => <div>{children}</div>,
    DialogContent: ({ children }) => <div>{children}</div>,
    DialogActions: ({ children }) => <div>{children}</div>,
    Button: ({ children, onClick, id }) => (
        <button id={id} onClick={onClick}>{children}</button>
    ),
    Typography: ({ children }) => <span>{children}</span>,
    Divider: () => <hr />,
    Box: ({ children }) => <div>{children}</div>,
}))

vi.mock('@mui/icons-material', () => ({
    Email: () => <span data-testid="icon-email" />,
}))

// Props declared at module level and reset in beforeEach.
// No vi.hoisted() needed as these are not referenced inside vi.mock()
const mockOnClose = vi.fn()
const mockOnClickLink = vi.fn()

function renderDialog(open = true) {
    return render(
        <PhishingEmailDialog
            open={open}
            onClose={mockOnClose}
            onClickLink={mockOnClickLink}
        />
    )
}

beforeEach(() => {
    vi.clearAllMocks()
})

// Rendering

describe('PhishingEmailDialog rendering', () => {
    it('renders the dialog when open is true', () => {
        renderDialog(true)
        expect(document.getElementById('phishing-email-dialog')).toBeInTheDocument()
    })

    it('renders expected email content when open', () => {
        renderDialog(true)
        expect(screen.getByText(/Unusual Activity Detected/i)).toBeInTheDocument()
        expect(screen.getByText(/FauxVault Security Team/i)).toBeInTheDocument()
        expect(screen.getByText(/security-alerts@fauxvault-support.com/i)).toBeInTheDocument()
    })

    it('renders nothing when open is false', () => {
        renderDialog(false)
        expect(document.getElementById('phishing-email-dialog')).not.toBeInTheDocument()
    })
})

// Interactions

describe('PhishingEmailDialog interactions', () => {
    it('calls onClickLink when the review link is clicked', async () => {
        const user = userEvent.setup()
        renderDialog(true)
        await user.click(document.getElementById('phishing-link'))
        expect(mockOnClickLink).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when the Close button is clicked', async () => {
        const user = userEvent.setup()
        renderDialog(true)
        await user.click(screen.getByRole('button', { name: /close/i }))
        expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
})
