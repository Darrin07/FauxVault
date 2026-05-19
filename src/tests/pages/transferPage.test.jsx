/**
 * Component integration tests: TransferPage
 *
 * Tests the Recent Transfers sidebar memo rendering behavior
 * when the xss_stored module is enabled vs disabled.
 *
 * What is tested:
 *  1. Sidebar memo display
 *    a. shows memo in Recent Transfers sidebar after a successful transfer
 *    b. does NOT show memo when transfer has no memo
 *
 *  2. VULN MODULE: Stored XSS (xss_stored)
 *    a. renders memo as raw HTML in sidebar when xss_stored is enabled
 *    b. renders memo as escaped text in sidebar when xss_stored is disabled
 * 
 *  3. VULN MODULE: Refelcted XSS (xss_reflected)
 *    a. renders server error as raw html in error alert when xss_reflected is enabled
 *    b. renders server error as escaped test in error alert when xss_reflected is disabled
 *
 * Mock strategy:
 *  useVulnerabilities: vi.hoisted mock, TransferPage imports this hook
 *  transfers service: vi.mock to control sendTransfer responses
 *
 * Note: the sidebar only appears after a successful transfer (local React state).
 * The XSS surface on this page is session-scoped and demonstrates the payload executing
 * immediately after submission. The true "stored" demonstration is HistoryPage,
 * which fetches from the database.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import TransferPage from '@/pages/TransferPage'

// Mock setup --------

const { mockUseVulnerabilities } = vi.hoisted(() => ({
    mockUseVulnerabilities: vi.fn(),
}))

vi.mock('@/hooks/useVulnerabilities', () => ({
    useVulnerabilities: mockUseVulnerabilities,
}))

vi.mock('@mui/material', () => ({
    Box: ({ children, component, onSubmit }) =>
        component === 'form'
            ? <form onSubmit={onSubmit}>{children}</form>
            : <div>{children}</div>,
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
    Alert: ({ children, onClose }) => (
        <div role="alert">
            {children}
            {onClose && <button onClick={onClose}>Close</button>}
        </div>
    ),
    InputAdornment: ({ children }) => <div>{children}</div>,
    Card: ({ children }) => <div>{children}</div>,
    CardContent: ({ children }) => <div>{children}</div>,
    List: ({ children }) => <ul>{children}</ul>,
    ListItem: ({ children }) => <li>{children}</li>,
    ListItemText: ({ primary, secondary }) => (
        <div>
            <span>{primary}</span>
            <div>{secondary}</div>
        </div>
    ),
    CircularProgress: () => <div data-testid="loading" />,
}))

vi.mock('@mui/icons-material', () => ({
    Send: () => <span>send-icon</span>,
    Tag: () => <span>hash-icon</span>,
    AttachMoney: () => <span>dollar-icon</span>,
    ChatBubbleOutlined: () => <span>memo-icon</span>,
    CheckCircleOutlined: () => <span>check-icon</span>,
}))

vi.mock('@/hooks/useVulnerabilities', () => ({
    useVulnerabilities: mockUseVulnerabilities,
}))

vi.mock('@/services/transfers', () => ({
    sendTransfer: vi.fn(),
    getTransfers: vi.fn(),
}))

import * as transfersApi from '@/services/transfers'

// Testing Fixtures (txn w/memo, no memo, xss -----

const MOCK_TRANSACTION_WITH_MEMO = {
    id: 'txn-001',
    fromAccountId: 'acc-sender',
    toAccountId: 'acc-receiver-uuid',
    amount: 50.00,
    reference: 'Rent payment',
    memo: 'Rent payment',
    createdAt: '2026-05-01T12:00:00.000Z',
}

const MOCK_TRANSACTION_NO_MEMO = {
    id: 'txn-002',
    fromAccountId: 'acc-sender',
    toAccountId: 'acc-receiver-uuid',
    amount: 25.00,
    reference: null,
    memo: null,
    createdAt: '2026-05-01T12:00:00.000Z',
}

const MOCK_XSS_TRANSACTION = {
    id: 'txn-xss',
    fromAccountId: 'acc-sender',
    toAccountId: 'acc-receiver-uuid',
    amount: 1.00,
    reference: '<img src=x onerror="alert(1)">',
    memo: '<img src=x onerror="alert(1)">',
    createdAt: '2026-05-01T12:00:00.000Z',
}

// Helper Functions -----------

function renderPage() {
    return render(
        <MemoryRouter initialEntries={['/transfer']}>
            <TransferPage />
        </MemoryRouter>
    )
}

// Submit the transfer form with min required fields
async function submitTransfer(user, toAccountId = 'acc-receiver-uuid', amount = '1') {
    await user.type(screen.getByLabelText(/recipient account id/i), toAccountId)
    await user.type(screen.getByLabelText(/amount/i), amount)
    await user.click(screen.getByRole('button', { name: /send transfer/i }))
}

beforeEach(() => {
    vi.clearAllMocks()
    mockUseVulnerabilities.mockReturnValue({
        modules: [{ id: 'xss_stored', name: 'Stored XSS', enabled: false }],
        toggleModule: vi.fn(),
        isVulnerable: false,
        notification: null,
        closeNotification: vi.fn(),
    })
})

// Sidebar memo display (shows memo when present, no memo when absent) -------

describe('TransferPage — sidebar memo display', () => {
    it('shows memo text in the Recent Transfers sidebar after a successful transfer', async () => {
        const user = userEvent.setup()
        transfersApi.sendTransfer.mockResolvedValue({ transaction: MOCK_TRANSACTION_WITH_MEMO })
        renderPage()

        await submitTransfer(user)

        expect(await screen.findByText(/recent transfers/i)).toBeInTheDocument()
        expect(screen.getByText(/rent payment/i)).toBeInTheDocument()
    })

    it('does not show a memo line when transfer has no memo', async () => {
        const user = userEvent.setup()
        transfersApi.sendTransfer.mockResolvedValue({ transaction: MOCK_TRANSACTION_NO_MEMO })
        renderPage()

        await submitTransfer(user)

        await screen.findByText(/recent transfers/i)
        // The em-dash separator only appears when a memo is present
        expect(screen.queryByText(/\u2014/)).not.toBeInTheDocument()
    })
})

// VULN MODULE: Stored XSS (renders DOM when enabled, hardened) -------

describe('TransferPage — Stored XSS module (xss_stored)', () => {
    it('renders memo as a DOM element in sidebar when xss_stored is enabled', async () => {
        mockUseVulnerabilities.mockReturnValue({
            modules: [{ id: 'xss_stored', name: 'Stored XSS', enabled: true }],
            toggleModule: vi.fn(),
            isVulnerable: true,
            notification: null,
            closeNotification: vi.fn(),
        })
        const user = userEvent.setup()
        transfersApi.sendTransfer.mockResolvedValue({ transaction: MOCK_XSS_TRANSACTION })
        const { container } = renderPage()

        await submitTransfer(user)
        await screen.findByText(/recent transfers/i)

        // dangerouslySetInnerHTML: <img src=x> becomes a real DOM node in sidebar
        expect(container.querySelector('img[src="x"]')).toBeInTheDocument()
    })

    it('renders memo as escaped text in sidebar when xss_stored is disabled', async () => {
        // Default beforeEach mock already has xss_stored disabled
        const user = userEvent.setup()
        transfersApi.sendTransfer.mockResolvedValue({ transaction: MOCK_XSS_TRANSACTION })
        const { container } = renderPage()

        await submitTransfer(user)
        await screen.findByText(/recent transfers/i)

        // React escaping: no <img> element rendered & the string entered is visible text
        expect(container.querySelector('img[src="x"]')).not.toBeInTheDocument()
    })
})

// Vulnerability Module: XSS_REFLECTED

describe('TransferPage — Reflected XSS module (xss_reflected)', () => {
    it('renders server error as a DOM element in error alert when xss_reflected is enabled', async () => {
        mockUseVulnerabilities.mockReturnValue({
            modules: [
                { id: 'xss_stored', name: 'Stored XSS', enabled: false },
                { id: 'xss_reflected', name: 'Reflected XSS', enabled: true },
            ],
            toggleModule: vi.fn(),
            isVulnerable: true,
            notification: null,
            closeNotification: vi.fn(),
        })
        const user = userEvent.setup()
        // Server rejects with an error whose message contains HTML
        transfersApi.sendTransfer.mockRejectedValue(new Error('<b>bad</b>'))
        const { container } = renderPage()

        await submitTransfer(user)
        // Wait for the error Alert to appear after the async rejection
        await screen.findByRole('alert')

        // dangerouslySetInnerHTML: <b> becomes a real DOM node in the error alert
        expect(container.querySelector('b')).toBeInTheDocument()
    })

    it('renders server error as escaped text in error alert when xss_reflected is disabled', async () => {
        mockUseVulnerabilities.mockReturnValue({
            modules: [
                { id: 'xss_stored', name: 'Stored XSS', enabled: false },
                { id: 'xss_reflected', name: 'Reflected XSS', enabled: false },
            ],
            toggleModule: vi.fn(),
            isVulnerable: false,
            notification: null,
            closeNotification: vi.fn(),
        })
        const user = userEvent.setup()
        transfersApi.sendTransfer.mockRejectedValue(new Error('<b>bad</b>'))
        const { container } = renderPage()

        await submitTransfer(user)
        await screen.findByRole('alert')

        // React escaping: no <b> element rendered
        expect(container.querySelector('b')).not.toBeInTheDocument()
        // The literal string "<b>bad</b>" is visible as text
        expect(screen.getByText('<b>bad</b>')).toBeInTheDocument()
    })
})
