/**
 * Component integration tests: HistoryPage
 *
 * Mocks the transfers service at the module level.
 * normalizeTransaction and formatDate are NOT mocked (tested in component)
 *
 * What is tested:
 *  1. Loading state
 *    a. shows skeleton rows while the API call is in flight
 *
 *  2. Empty state
 *    a. shows 'No matches found' when server returns an empty transaction list
 *
 *  3. Data rendering
 *    a. renders a row for each transaction returned by the server
 *    b. renders the memo as the description in the Description column
 *    c. does NOT render a Balance column header
 *    d. does NOT show 'Invalid Date' in any row (regression for the T00:00:00 bug)
 *
 *  4. Page heading
 *    a shows 'Transfer History' when URL has ?type=transfers
 *    b shows 'Transaction History' when URL has no type param
 *
 *  5. Client-side search
 *    a. filters visible rows by description text
 *    b. shows 'No matches found' when search has no results
 *    c. shows result count after filtering
 * 
 *  6. Vulnerablility Module:  Stored XSS (xss_stored)
 *    a. renders description as raw HTML when xss_stored is enabled
 *    b. renders description as escaped text when xss_stored is disabled
 * 
 *  7. Vulnerability Module: Reflected XSS (xss_reflected)
 *    a. URL ?q= param seeds the search field
 *    b. renders search query as HTML when xss_reflected is enabled, even with no matching rows
 *    c. renders search query as escaped text when xss_reflected is disabled
 *    d. empty ?q= does not show "matching" label
 *
 *  8. Educational notification (xss_reflected + weak_session_tokens interaction)
 *    a. shows "Attack Succeeded" dialog when token is in document.cookie
 *    b. shows "Attack Blocked" dialog when token is not in document.cookie
 *    c. no notification when xss_reflected is disabled
 *    d. no notification when query has no HTML
 *    e. dismiss button closes the dialog
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import HistoryPage from '@/pages/HistoryPage'

// Mock Setup ------
// HistoryPage imports useVulnerabilities.  Without thhis mock, the module import resolves to the hook
// which needs VulnerabilityProvider in the tree.  vi.hoisted() guarantees mock function is created before import
// statement resolves

const { mockUseVulnerabilities } = vi.hoisted(() => ({
    mockUseVulnerabilities: vi.fn(),
}))

vi.mock('@mui/material', () => ({
    Box: ({ children, id }) => <div id={id}>{children}</div>,
    Typography: ({ children, dangerouslySetInnerHTML }) =>
        dangerouslySetInnerHTML
            ? <span dangerouslySetInnerHTML={dangerouslySetInnerHTML} />
            : <span>{children}</span>,
    TextField: (props) => <input placeholder={props.placeholder} onChange={props.onChange} value={props.value} />,
    InputAdornment: ({ children }) => <div>{children}</div>,
    Table: ({ children }) => <table>{children}</table>,
    TableBody: ({ children }) => <tbody>{children}</tbody>,
    TableCell: ({ children }) => <td>{children}</td>,
    TableContainer: ({ children }) => <div>{children}</div>,
    TableHead: ({ children }) => <thead>{children}</thead>,
    TableRow: ({ children }) => <tr>{children}</tr>,
    Chip: ({ label }) => <span>{label}</span>,
    Skeleton: () => <div data-testid="skeleton" />,
    Paper: ({ children }) => <div>{children}</div>,
    Dialog: ({ open, children, id }) =>
        open ? <div id={id} role="dialog">{children}</div> : null,
    DialogTitle: ({ children }) => <div>{children}</div>,
    DialogContent: ({ children }) => <div>{children}</div>,
    DialogActions: ({ children }) => <div>{children}</div>,
    Button: ({ children, onClick, disabled, type }) => (
        <button type={type} onClick={onClick} disabled={disabled}>{children}</button>
    ),
}))

vi.mock('@mui/icons-material', () => ({
    Search: () => <span>search</span>,
}))

vi.mock('@/hooks/useVulnerabilities', () => ({
    useVulnerabilities: mockUseVulnerabilities,
}))

vi.mock('@/services/transfers', () => ({
    getTransfers: vi.fn(),
    sendTransfer: vi.fn(),
}))

import * as transfersApi from '@/services/transfers'

// Matches the raw server response shape from GET /transfers
const MOCK_TRANSACTIONS = [
    {
        id: 'txn-001',
        fromAccountId: 'acc-001',
        toAccountId: 'acc-002',
        amount: 250.00,
        reference: 'Rent for May',
        memo: 'Rent for May',
        createdAt: '2026-04-27T15:30:00.000Z',
    },
    {
        id: 'txn-002',
        fromAccountId: 'acc-003',
        toAccountId: 'acc-001',
        amount: 50.00,
        reference: null,
        memo: 'Coffee reimbursement',
        createdAt: '2026-04-28T09:00:00.000Z',
    },
]

function renderPage(route = '/history') {
    return render(
        <MemoryRouter initialEntries={[route]}>
            <HistoryPage />
        </MemoryRouter>
    )
}

beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    // Default: xss_stored disabled (hardened) — keeps all existing tests unaffected
    mockUseVulnerabilities.mockReturnValue({
        modules: [
            { id: 'xss_stored', name: 'Stored XSS', enabled: false },
            { id: 'xss_reflected', name: 'Reflected XSS', enabled: false },
            { id: 'weak_session_tokens', name: 'Weak Session Tokens', enabled: false },
        ],
        toggleModule: vi.fn(),
        isVulnerable: false,
        notification: null,
        closeNotification: vi.fn(),
    })
})

// Loading test

describe('HistoryPage: loading state', () => {
    it('shows skeleton rows while the API call is in flight', () => {
        transfersApi.getTransfers.mockReturnValue(new Promise(() => { }))
        renderPage()
        // Verify loading by checking no table headers
        expect(screen.queryByRole('columnheader', { name: /date/i })).not.toBeInTheDocument()
    })
})

// Empty state test

describe('HistoryPage: empty state', () => {
    it('shows No transactions yet when server returns an empty transaction list', async () => {
        transfersApi.getTransfers.mockResolvedValue({ transactions: [] })
        renderPage()
        expect(await screen.findByText(/no transactions yet/i)).toBeInTheDocument()
    })
})

// Data render test

describe('HistoryPage: data rendering', () => {
    it('renders one row per transaction returned by the server', async () => {
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage()

        await screen.findByRole('table')
        const rows = screen.getAllByRole('row')
        expect(rows).toHaveLength(3)
    })

    it('renders the memo as the description in the table', async () => {
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage()

        expect(await screen.findByText('Rent for May')).toBeInTheDocument()
        expect(await screen.findByText('Coffee reimbursement')).toBeInTheDocument()
    })

    it('does NOT render a Balance column header', async () => {
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage()

        await screen.findByRole('table')
        expect(screen.queryByRole('columnheader', { name: /balance/i })).not.toBeInTheDocument()
    })

    it('does NOT show Invalid Date in any row — regression for the T00:00:00 bug', async () => {
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage()

        await screen.findByRole('table')
        expect(screen.queryByText(/invalid date/i)).not.toBeInTheDocument()
    })

    it('shows a transaction count below the table', async () => {
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage()

        expect(await screen.findByText(/2 transactions found/i)).toBeInTheDocument()
    })
})

// Page heading tests

describe('HistoryPage: page heading', () => {
    it('shows Transfer History when URL has ?type=transfers', async () => {
        transfersApi.getTransfers.mockResolvedValue({ transactions: [] })
        renderPage('/history?type=transfers')
        expect(await screen.findByText('Transfer History')).toBeInTheDocument()
    })

    it('shows Transaction History when URL has no type param', async () => {
        transfersApi.getTransfers.mockResolvedValue({ transactions: [] })
        renderPage('/history')
        expect(await screen.findByText('Transaction History')).toBeInTheDocument()
    })
})

// Client-side searches test

describe('HistoryPage: client-side search', () => {
    it('filters visible rows by description when user types in search', async () => {
        const user = userEvent.setup()
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage()

        await screen.findByRole('table')
        await user.type(screen.getByPlaceholderText(/search/i), 'Rent')

        expect(screen.getByText('Rent for May')).toBeInTheDocument()
        expect(screen.queryByText('Coffee reimbursement')).not.toBeInTheDocument()
    })

    it('shows No matches found when search has no results', async () => {
        const user = userEvent.setup()
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage()

        await screen.findByRole('table')
        await user.type(screen.getByPlaceholderText(/search/i), 'zzzznotexist')

        expect(await screen.findByText(/no matches found/i)).toBeInTheDocument()
    })

    it('shows the filtered count after searching', async () => {
        const user = userEvent.setup()
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage()

        await screen.findByRole('table')
        await user.type(screen.getByPlaceholderText(/search/i), 'Rent')

        expect(await screen.findByText(/1 transaction found/i)).toBeInTheDocument()
    })
})

// Vulnerability Module: Stored XSS

const XSS_TRANSACTION = {
    id: 'txn-xss',
    fromAccountId: 'acc-001',
    toAccountId: 'acc-002',
    amount: 1.00,
    reference: '<img src=x onerror="alert(1)">',
    memo: '<img src=x onerror="alert(1)">',
    createdAt: '2026-05-01T12:00:00.000Z',
}

describe('HistoryPage: Stored XSS module (xss_stored)', () => {
    it('renders description HTML as a DOM element when xss_stored is enabled', async () => {
        mockUseVulnerabilities.mockReturnValue({
            modules: [
                { id: 'xss_stored', name: 'Stored XSS', enabled: true },
                { id: 'xss_reflected', name: 'Reflected XSS', enabled: false },
                { id: 'weak_session_tokens', name: 'Weak Session Tokens', enabled: false },
            ],
            toggleModule: vi.fn(),
            isVulnerable: true,
            notification: null,
            closeNotification: vi.fn(),
        })
        transfersApi.getTransfers.mockResolvedValue({ transactions: [XSS_TRANSACTION] })
        const { container } = renderPage()

        await screen.findByRole('table')

        // dangerouslySetInnerHTML: <img src=x> becomes a real DOM node
        expect(container.querySelector('img[src="x"]')).toBeInTheDocument()
    })

    it('renders description HTML as escaped text when xss_stored is disabled', async () => {
        // Default beforeEach mock already has xss_stored disabled
        transfersApi.getTransfers.mockResolvedValue({ transactions: [XSS_TRANSACTION] })
        const { container } = renderPage()

        await screen.findByRole('table')

        // React escaping: no <img> element, raw string visible as text
        expect(container.querySelector('img[src="x"]')).not.toBeInTheDocument()
        expect(screen.getByText(/<img/)).toBeInTheDocument()
    })
})

// Vulnerability Module: Reflected XSS (xss_reflected)

describe('HistoryPage: Reflected XSS module (xss_reflected)', () => {
    it('seeds the search field from the ?q= URL parameter', async () => {
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage('/history?q=Rent')

        await screen.findByRole('table')
        const input = screen.getByPlaceholderText(/search/i)
        expect(input).toHaveValue('Rent')
        expect(screen.getByText(/matching "Rent"/i)).toBeInTheDocument()
    })

    it('renders the search query as HTML when xss_reflected is enabled, even with no matching rows', async () => {
        mockUseVulnerabilities.mockReturnValue({
            modules: [
                { id: 'xss_stored', name: 'Stored XSS', enabled: false },
                { id: 'xss_reflected', name: 'Reflected XSS', enabled: true },
                { id: 'weak_session_tokens', name: 'Weak Session Tokens', enabled: false },
            ],
            toggleModule: vi.fn(),
            isVulnerable: true,
            notification: null,
            closeNotification: vi.fn(),
        })
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        const { container } = renderPage('/history?q=<img src=x>')

        await screen.findByText(/no matches found/i)
        // dangerouslySetInnerHTML: <img src=x> in the search summary becomes a real DOM node
        expect(container.querySelector('img[src="x"]')).toBeInTheDocument()
    })

    it('renders the search query as escaped text when xss_reflected is disabled', async () => {
        // Default beforeEach mock has xss_reflected disabled
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        const { container } = renderPage('/history?q=<img src=x>')

        await screen.findByText(/no matches found/i)
        expect(container.querySelector('img[src="x"]')).not.toBeInTheDocument()
    })

    it('does not show "matching" when ?q= is empty', async () => {
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage('/history?q=')

        await screen.findByRole('table')
        expect(screen.queryByText(/matching/i)).not.toBeInTheDocument()
    })
})    

//Educational notification (xss_reflected + weak_session_tokens)

describe('HistoryPage: Educational notification', () => {
    // Cookie cleanup scoped to this describe block only
    afterEach(() => {
        document.cookie.split(';').forEach(c => {
            document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT'
        })
    })

    function enableReflectedXss() {
        mockUseVulnerabilities.mockReturnValue({
            modules: [
                { id: 'xss_stored', name: 'Stored XSS', enabled: false },
                { id: 'xss_reflected', name: 'Reflected XSS', enabled: true },
                { id: 'weak_session_tokens', name: 'Weak Session Tokens', enabled: true },
            ],
            toggleModule: vi.fn(),
            isVulnerable: true,
            notification: null,
            closeNotification: vi.fn(),
        })
    }

    it('shows "Attack Succeeded" dialog when token is in document.cookie', async () => {
        enableReflectedXss()
        document.cookie = 'token=fake-jwt-token-abc123'
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage('/history?q=<img src=x>')

        await waitFor(() => {
            const dialog = document.getElementById('xss-reflected-notification')
            expect(dialog).toBeInTheDocument()
        })
        expect(screen.getByText(/Attack Succeeded/i)).toBeInTheDocument()
        expect(screen.getByText(/session token/i)).toBeInTheDocument()
        expect(screen.getByText(/fake-jwt-token-abc123/)).toBeInTheDocument()
    })

    it('shows "Attack Blocked" dialog when token is not in document.cookie', async () => {
        enableReflectedXss()
        // Ensure no token cookie is set
        document.cookie = 'token=;expires=Thu, 01 Jan 1970 00:00:00 GMT'
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage('/history?q=<img src=x>')

        await waitFor(() => {
            const dialog = document.getElementById('xss-reflected-notification')
            expect(dialog).toBeInTheDocument()
        })
        expect(screen.getByText(/Attack Blocked/i)).toBeInTheDocument()
        expect(screen.getByText(/hardening on session tokens/i)).toBeInTheDocument()
    })

    it('shows no notification when xss_reflected is disabled', async () => {
        // Default beforeEach mock has xss_reflected disabled
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage('/history?q=<img src=x>')

        // Search query doesn't match any transaction, so table won't render; wait for empty state
        await screen.findByText(/no matches found/i)
        expect(document.getElementById('xss-reflected-notification')).not.toBeInTheDocument()
    })

    it('shows no notification when search query has no HTML', async () => {
        enableReflectedXss()
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage('/history?q=normaltext')

        // 'normaltext' doesn't match any transaction; wait for empty state 
        await screen.findByText(/no matches found/i)
        expect(document.getElementById('xss-reflected-notification')).not.toBeInTheDocument()
    })

    it('dismiss button closes the notification dialog', async () => {
        const user = userEvent.setup()
        enableReflectedXss()
        document.cookie = 'token=fake-jwt-token-abc123'
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage('/history?q=<img src=x>')

        await waitFor(() => {
            expect(document.getElementById('xss-reflected-notification')).toBeInTheDocument()
        })

        await user.click(screen.getByRole('button', { name: /dismiss/i }))

        await waitFor(() => {
            expect(document.getElementById('xss-reflected-notification')).not.toBeInTheDocument()
        })
    })
})
