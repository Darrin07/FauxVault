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
 *  8. Educational notification: XSS phishing result scenarios
 *    a. shows "Attack Blocked" dialog when xss reflected is hardened
 *    b. shows "Attack Succeeded" dialog when xss reflected is enabled
 *    c. shows "Chain Attack Succeeded" when xss reflected + weak session tokens enabled and token readable
 *    d. shows "Attack Succeeded" (not chain) when weak session tokens on but cookie absent
 *    e. no notification when query has no HTML
 *    f. dismiss button closes the dialog
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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
    TextField: (props) => (
        <input
            type={props.type || 'text'}
            aria-label={props.label || props['aria-label']}
            placeholder={props.placeholder}
            onChange={props.onChange}
            value={props.value}
        />
    ),
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
    Collapse: ({ in: open, children }) => open ? <div>{children}</div> : null,
}))

vi.mock('@mui/icons-material', () => ({
    Search: () => <span>search</span>,
    ExpandMore: () => <span>expand-more</span>,
    ExpandLess: () => <span>expand-less</span>,
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
    document.cookie.split(';').forEach(c => {
        document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=Thu, 01 Jan 1970 00:00:00 GMT')
    })
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
        await user.type(screen.getByPlaceholderText(/description, type, amount/i), 'Rent')

        expect(screen.getByText('Rent for May')).toBeInTheDocument()
        expect(screen.queryByText('Coffee reimbursement')).not.toBeInTheDocument()
    })

    it('shows No matches found when search has no results', async () => {
        const user = userEvent.setup()
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage()

        await screen.findByRole('table')
        await user.type(screen.getByPlaceholderText(/description, type, amount/i), 'zzzznotexist')

        expect(await screen.findByText(/no matches found/i)).toBeInTheDocument()
    })

    it('shows the filtered count after searching', async () => {
        const user = userEvent.setup()
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage()

        await screen.findByRole('table')
        await user.type(screen.getByPlaceholderText(/description, type, amount/i), 'Rent')

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
        const input = screen.getByPlaceholderText(/description, type, amount/i)
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

// Educational notification: XSS phishing result scenarios

describe('HistoryPage: Educational notification', () => {
    // Cookie cleanup scoped to this describe block only
    afterEach(() => {
        document.cookie.split(';').forEach(c => {
            document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT'
        })
    })

    // XSS vulnerable, weak session tokens OFF: attack succeeded, no chain
    function enableReflectedXssOnly() {
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
    }

    // XSS vulnerable AND weak session tokens ON: chain attack conditions
    function enableReflectedXssAndWeakSession() {
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

    it('shows "Attack Blocked" (success) dialog when xss_reflected is disabled (hardened)', async () => {
        // Default beforeEach mock has xss_reflected disabled
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage('/history?q=<img src=x>')

        await waitFor(() => {
            expect(document.getElementById('xss-reflected-notification')).toBeInTheDocument()
        })
        expect(screen.getByText(/Attack Blocked/i)).toBeInTheDocument()
        expect(screen.getByText(/hardened against Reflected XSS/i)).toBeInTheDocument()
    })

    it('shows "Attack Succeeded" dialog when xss_reflected is enabled', async () => {
        enableReflectedXssOnly()
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage('/history?q=<img src=x>')

        await waitFor(() => {
            expect(document.getElementById('xss-reflected-notification')).toBeInTheDocument()
        })
        expect(screen.getByText(/Attack Succeeded/i)).toBeInTheDocument()
        expect(screen.getByText(/see the rendered alert\(\)/i)).toBeInTheDocument()
    })

    it('shows "Chain Attack Succeeded" when xss reflected and weak session tokens are both enabled and token is readable', async () => {
        enableReflectedXssAndWeakSession()
        document.cookie = 'token=fake-jwt-chain-token'
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage('/history?q=<img src=x>')

        await waitFor(() => {
            expect(document.getElementById('xss-reflected-notification')).toBeInTheDocument()
        })
        expect(screen.getByText(/Chain Attack Succeeded/i)).toBeInTheDocument()
        expect(screen.getByText(/fake-jwt-chain-token/)).toBeInTheDocument()
    })

    it('shows "Attack Succeeded" (not chain) when weak session tokens is on but cookie is absent', async () => {
        enableReflectedXssAndWeakSession()
        document.cookie = 'token=;expires=Thu, 01 Jan 1970 00:00:00 GMT'
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage('/history?q=<img src=x>')

        await waitFor(() => {
            expect(document.getElementById('xss-reflected-notification')).toBeInTheDocument()
        })
        expect(screen.getByText(/Attack Succeeded/i)).toBeInTheDocument()
        expect(screen.queryByText(/Chain Attack Succeeded/i)).not.toBeInTheDocument()
    })

    it('shows no notification when search query has no HTML', async () => {
        enableReflectedXssOnly()
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage('/history?q=normaltext')

        await screen.findByText(/no matches found/i)
        expect(document.getElementById('xss-reflected-notification')).not.toBeInTheDocument()
    })

    it('dismiss button closes the notification dialog', async () => {
        const user = userEvent.setup()
        enableReflectedXssOnly()
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

// Server-side memo search (SQL injection module, a03-injection-sql)
describe('HistoryPage -- server-side search via ?memo=', () => {
    it('fires a server fetch with the memo value when ?memo= is in the URL', async () => {
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage('/history?memo=Rent')

        await waitFor(() => {
            expect(transfersApi.getTransfers).toHaveBeenCalledWith(null, 'Rent')
        })
    })

    it('combines ?memo= with ?type= when both are in the URL', async () => {
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage('/history?type=sent&memo=Coffee')

        await waitFor(() => {
            expect(transfersApi.getTransfers).toHaveBeenCalledWith('sent', 'Coffee')
        })
    })

    it('shows the server-search banner when ?memo= is set', async () => {
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage('/history?memo=Rent')

        expect(await screen.findByText(/server search active for memo: "Rent"/i)).toBeInTheDocument()
    })

    it('does NOT show the banner when ?memo= is absent', async () => {
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage('/history')

        await waitFor(() => expect(transfersApi.getTransfers).toHaveBeenCalled())
        expect(screen.queryByText(/server search active/i)).not.toBeInTheDocument()
    })

    it('typing in the server-search input fires a server fetch after the debounce', async () => {
        transfersApi.getTransfers.mockResolvedValue({ transactions: [] })
        const user = userEvent.setup()
        renderPage('/history')

        // Wait for the initial mount fetch (no memo) so we can isolate the typing-driven call
        await waitFor(() => expect(transfersApi.getTransfers).toHaveBeenCalledWith(null, null))
        transfersApi.getTransfers.mockClear()
        transfersApi.getTransfers.mockResolvedValue({ transactions: [] })

        // Panel is collapsed by default when no ?memo= is in URL; expand it first.
        await user.click(screen.getByRole('button', { name: /advanced search/i }))

        await user.type(
            screen.getByPlaceholderText(/search by memo/i),
            'Coffee',
        )

        // Debounce is 300ms; waitFor's default 1000ms is plenty
        await waitFor(() => {
            expect(transfersApi.getTransfers).toHaveBeenCalledWith(null, 'Coffee')
        })
    })
})

// Advanced Search panel + date range filter (companion to server-side memo search)
describe('HistoryPage -- Advanced Search panel', () => {
    it('starts collapsed when no ?memo= is in the URL (server-search input is hidden)', async () => {
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage('/history')

        await waitFor(() => expect(transfersApi.getTransfers).toHaveBeenCalled())
        expect(screen.queryByPlaceholderText(/search by memo/i)).not.toBeInTheDocument()
        // The button to expand the panel is present
        expect(screen.getByRole('button', { name: /advanced search/i })).toBeInTheDocument()
    })

    it('auto-opens when ?memo= is present in the URL on mount', async () => {
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        renderPage('/history?memo=Coffee')

        // The server-search input is visible without needing a click
        expect(await screen.findByPlaceholderText(/search by memo/i)).toBeInTheDocument()
    })

    it('toggles open and closed when the Advanced Search button is clicked', async () => {
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        const user = userEvent.setup()
        renderPage('/history')

        await waitFor(() => expect(transfersApi.getTransfers).toHaveBeenCalled())
        const button = screen.getByRole('button', { name: /advanced search/i })

        await user.click(button)
        expect(screen.getByPlaceholderText(/search by memo/i)).toBeInTheDocument()

        await user.click(button)
        expect(screen.queryByPlaceholderText(/search by memo/i)).not.toBeInTheDocument()
    })
})

describe('HistoryPage -- Advanced Search date range filter', () => {
    // MOCK_TRANSACTIONS has txn-001 on 2026-04-27 and txn-002 on 2026-04-28.
    it('filters out transactions earlier than the From date', async () => {
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        const user = userEvent.setup()
        renderPage('/history')

        await waitFor(() => expect(transfersApi.getTransfers).toHaveBeenCalled())
        await user.click(screen.getByRole('button', { name: /advanced search/i }))

        const fromInput = screen.getByLabelText(/from/i)
        fireEvent.change(fromInput, { target: { value: '2026-04-28' } })

        // txn-001 (Apr 27) hidden; txn-002 (Apr 28) visible
        expect(screen.queryByText('Rent for May')).not.toBeInTheDocument()
        expect(screen.getByText('Coffee reimbursement')).toBeInTheDocument()
    })

    it('filters out transactions later than the To date', async () => {
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        const user = userEvent.setup()
        renderPage('/history')

        await waitFor(() => expect(transfersApi.getTransfers).toHaveBeenCalled())
        await user.click(screen.getByRole('button', { name: /advanced search/i }))

        const toInput = screen.getByLabelText(/to/i)
        fireEvent.change(toInput, { target: { value: '2026-04-27' } })

        // txn-001 (Apr 27) visible; txn-002 (Apr 28) hidden
        expect(screen.getByText('Rent for May')).toBeInTheDocument()
        expect(screen.queryByText('Coffee reimbursement')).not.toBeInTheDocument()
    })

    it('shows all transactions when both date inputs are empty', async () => {
        transfersApi.getTransfers.mockResolvedValue({ transactions: MOCK_TRANSACTIONS })
        const user = userEvent.setup()
        renderPage('/history')

        await waitFor(() => expect(transfersApi.getTransfers).toHaveBeenCalled())
        await user.click(screen.getByRole('button', { name: /advanced search/i }))

        // Both inputs untouched, both transactions render
        expect(screen.getByText('Rent for May')).toBeInTheDocument()
        expect(screen.getByText('Coffee reimbursement')).toBeInTheDocument()
    })
})
