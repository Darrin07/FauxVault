/**
 * Component integration tests: DashboardPage — TransferModal
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../../context/AuthContext'
import DashboardPage from '../../pages/DashboardPage'

const {
    mockGetBalance,
    mockGetDeposits,
    mockGetWithdrawals,
    mockSendTransfer,
    mockGetTransfers,
} = vi.hoisted(() => ({
    mockGetBalance: vi.fn(),
    mockGetDeposits: vi.fn(),
    mockGetWithdrawals: vi.fn(),
    mockSendTransfer: vi.fn(),
    mockGetTransfers: vi.fn(),
}))

vi.mock('../../services/accounts', () => ({
    getBalance: mockGetBalance,
    getDeposits: mockGetDeposits,
    getWithdrawals: mockGetWithdrawals,
}))

vi.mock('../../services/transfers', () => ({
    sendTransfer: mockSendTransfer,
    getTransfers: mockGetTransfers,
}))

// Static fixtures

const MOCK_TRANSACTION = {
    id: 'txn-001',
    fromAccountId: 'acc-001',
    toAccountId: '660e8400-e29b-41d4-a716-446655440000',
    amount: 100.00,
    reference: 'Test transfer',
    memo: 'Test transfer',
    createdAt: '2026-04-27T15:30:00.000Z',
}

function renderPage() {
    return render(
        <MemoryRouter>
            <AuthProvider>
                <DashboardPage />
            </AuthProvider>
        </MemoryRouter>
    )
}

beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()

    // Seed the three on-mount API calls
    mockGetBalance.mockResolvedValue({
        id: 'acc-001',
        accountNumber: 'FAUX-TEST123',
        balance: 1000.00,
        accountType: 'Checking',
        lastUpdated: '2026-04-27T12:00:00.000Z',
    })
    mockGetDeposits.mockResolvedValue({ total: 500.00, period: 'this month' })
    mockGetWithdrawals.mockResolvedValue({ total: 200.00, period: 'this month' })

    // Default: sendTransfer resolves
    mockSendTransfer.mockResolvedValue({ transaction: MOCK_TRANSACTION })
})

//Helper
async function openModal(user) {
    await user.click(await screen.findByRole('button', { name: /transfer funds/i }))
    await screen.findByRole('dialog')
}

// Opening & Closing 

describe('DashboardPage — TransferModal opening and closing', () => {
    it('opens the Transfer Funds modal when the button is clicked', async () => {
        const user = userEvent.setup()
        renderPage()

        await user.click(await screen.findByRole('button', { name: /transfer funds/i }))
        expect(await screen.findByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Transfer Funds')).toBeInTheDocument()
    })

    it('closes the modal and resets the form when Cancel is clicked', async () => {
        const user = userEvent.setup()
        renderPage()

        await openModal(user)
        await user.type(screen.getByLabelText(/recipient account id/i), 'some-uuid')
        await user.click(screen.getByRole('button', { name: /cancel/i }))

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })
    })
})

// Validation tests

describe('DashboardPage — TransferModal validation', () => {
    it('shows an error when recipient ID is empty on submit', async () => {
        const user = userEvent.setup()
        renderPage()
        await openModal(user)

        await user.type(screen.getByLabelText(/amount \(\$\)/i), '100')
        await user.click(screen.getByRole('button', { name: /send transfer/i }))

        const alert = await screen.findByRole('alert')
        expect(alert).toHaveTextContent(/Recipient Account ID is required/i)
    })

    it('shows an error when amount is zero', async () => {
        const user = userEvent.setup()
        renderPage()
        await openModal(user)

        await user.type(screen.getByLabelText(/recipient account id/i), 'some-uuid')
        await user.type(screen.getByLabelText(/amount \(\$\)/i), '0')
        await user.click(screen.getByRole('button', { name: /send transfer/i }))

        const alert = await screen.findByRole('alert')
        expect(alert).toHaveTextContent(/valid amount/i)
    })

    it('does NOT call sendTransfer when validation fails', async () => {
        const user = userEvent.setup()
        renderPage()
        await openModal(user)

        await user.type(screen.getByLabelText(/amount \(\$\)/i), '100')
        await user.click(screen.getByRole('button', { name: /send transfer/i }))

        await screen.findByRole('alert')
        expect(mockSendTransfer).not.toHaveBeenCalled()
    })
})

// API tests

describe('DashboardPage — TransferModal API contract', () => {
    it('calls sendTransfer() with toAccountId — not recipientId', async () => {
        const user = userEvent.setup()
        renderPage()
        await openModal(user)

        await user.type(screen.getByLabelText(/recipient account id/i), '660e8400-e29b-41d4-a716-446655440000')
        await user.type(screen.getByLabelText(/amount \(\$\)/i), '100')
        await user.click(screen.getByRole('button', { name: /send transfer/i }))

        await waitFor(() => {
            expect(mockSendTransfer).toHaveBeenCalledWith(
                expect.objectContaining({ toAccountId: '660e8400-e29b-41d4-a716-446655440000' })
            )
            expect(mockSendTransfer).not.toHaveBeenCalledWith(
                expect.objectContaining({ recipientId: expect.anything() })
            )
        })
    })

    it('includes amount and memo in the payload', async () => {
        const user = userEvent.setup()
        renderPage()
        await openModal(user)

        await user.type(screen.getByLabelText(/recipient account id/i), '660e8400-e29b-41d4-a716-446655440000')
        await user.type(screen.getByLabelText(/amount \(\$\)/i), '100')
        await user.type(screen.getByLabelText(/memo/i), 'Lunch')
        await user.click(screen.getByRole('button', { name: /send transfer/i }))

        await waitFor(() => {
            const payload = mockSendTransfer.mock.calls[0][0]
            expect(payload).toHaveProperty('amount', 100)
            expect(payload).toHaveProperty('memo', 'Lunch')
        })
    })
})

// Success & Failure tests

describe('DashboardPage — TransferModal success and failure', () => {
    it('shows a success Alert after the transfer completes', async () => {
        const user = userEvent.setup()
        mockSendTransfer.mockResolvedValue({ transaction: MOCK_TRANSACTION })

        renderPage()
        await openModal(user)

        const recipientField = screen.getByLabelText(/recipient account id/i)
        const amountField = screen.getByLabelText(/amount \(\$\)/i)

        await user.type(recipientField, '660e8400-e29b-41d4-a716-446655440000')
        await user.type(amountField, '100')

        expect(recipientField).toHaveValue('660e8400-e29b-41d4-a716-446655440000')

        await user.click(screen.getByRole('button', { name: /send transfer/i }))

        await waitFor(() => {
            expect(mockSendTransfer).toHaveBeenCalledTimes(1)
        })

        const alert = await screen.findByRole('alert')
        expect(alert).toHaveTextContent(/successfully transferred/i)
    })

    it('shows an error Alert on server failure', async () => {
        const user = userEvent.setup()
        mockSendTransfer.mockRejectedValue(new Error('Insufficient funds'))

        renderPage()
        await openModal(user)

        await user.type(screen.getByLabelText(/recipient account id/i), '660e8400-e29b-41d4-a716-446655440000')
        await user.type(screen.getByLabelText(/amount \(\$\)/i), '99999')
        await user.click(screen.getByRole('button', { name: /send transfer/i }))

        const alert = await screen.findByRole('alert')
        expect(alert).toHaveTextContent(/insufficient funds/i)
    })

    it('keeps fields populated after failure so user can correct and retry', async () => {
        const user = userEvent.setup()
        mockSendTransfer.mockRejectedValue(new Error('Insufficient funds'))

        renderPage()
        await openModal(user)

        await user.type(screen.getByLabelText(/recipient account id/i), '660e8400-e29b-41d4-a716-446655440000')
        await user.type(screen.getByLabelText(/amount \(\$\)/i), '99999')
        await user.click(screen.getByRole('button', { name: /send transfer/i }))

        await screen.findByRole('alert')
        expect(screen.getByLabelText(/recipient account id/i)).toHaveValue('660e8400-e29b-41d4-a716-446655440000')
    })
})
