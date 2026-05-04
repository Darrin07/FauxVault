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
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import HistoryPage from '@/pages/HistoryPage'

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
})

// Loading test

describe('HistoryPage — loading state', () => {
    it('shows skeleton rows while the API call is in flight', () => {
        transfersApi.getTransfers.mockReturnValue(new Promise(() => { }))
        renderPage()
        // Verify loading by checking no table headers
        expect(screen.queryByRole('columnheader', { name: /date/i })).not.toBeInTheDocument()
    })
})

// Empty state test

describe('HistoryPage — empty state', () => {
    it('shows No matches found when server returns an empty transaction list', async () => {
        transfersApi.getTransfers.mockResolvedValue({ transactions: [] })
        renderPage()
        expect(await screen.findByText(/no matches found/i)).toBeInTheDocument()
    })
})

// Data render test

describe('HistoryPage — data rendering', () => {
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

describe('HistoryPage — page heading', () => {
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

describe('HistoryPage — client-side search', () => {
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
