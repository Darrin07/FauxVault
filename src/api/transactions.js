import { mockDelay } from './client'

/* ── Mock transaction history ── */
const MOCK_TRANSACTIONS = [
    { id: 1, date: '2026-04-16', description: 'Direct Deposit — Employer', type: 'deposit', amount: 2800.00, balanceAfter: 12480.00 },
    { id: 2, date: '2026-04-15', description: 'Transfer to Jane Smith', type: 'transfer', amount: -500.00, balanceAfter: 9680.00 },
    { id: 3, date: '2026-04-14', description: 'ATM Withdrawal', type: 'withdrawal', amount: -200.00, balanceAfter: 10180.00 },
    { id: 4, date: '2026-04-13', description: 'Online Purchase — Amazon', type: 'withdrawal', amount: -89.99, balanceAfter: 10380.00 },
    { id: 5, date: '2026-04-12', description: 'Transfer to Jane Smith', type: 'transfer', amount: -150.00, balanceAfter: 10469.99 },
    { id: 6, date: '2026-04-11', description: 'Payroll Deposit', type: 'deposit', amount: 1400.00, balanceAfter: 10619.99 },
    { id: 7, date: '2026-04-10', description: 'Utility Bill — Electric Co.', type: 'withdrawal', amount: -145.00, balanceAfter: 9219.99 },
    { id: 8, date: '2026-04-09', description: 'Grocery Store', type: 'withdrawal', amount: -67.32, balanceAfter: 9364.99 },
    { id: 9, date: '2026-04-08', description: 'Transfer to Bob Wilson', type: 'transfer', amount: -75.00, balanceAfter: 9432.31 },
    { id: 10, date: '2026-04-07', description: 'Interest Payment', type: 'deposit', amount: 12.50, balanceAfter: 9507.31 },
    { id: 11, date: '2026-04-05', description: 'Gas Station', type: 'withdrawal', amount: -52.40, balanceAfter: 9494.81 },
    { id: 12, date: '2026-04-03', description: 'Transfer to Jane Smith', type: 'transfer', amount: -1200.00, balanceAfter: 9547.21 },
    { id: 13, date: '2026-04-02', description: 'Freelance Payment — Client A', type: 'deposit', amount: 750.00, balanceAfter: 10747.21 },
    { id: 14, date: '2026-04-01', description: 'Rent Payment', type: 'withdrawal', amount: -1500.00, balanceAfter: 9997.21 },
    { id: 15, date: '2026-03-30', description: 'Refund — Online Return', type: 'deposit', amount: 42.99, balanceAfter: 11497.21 },
    { id: 16, date: '2026-03-28', description: 'Transfer to Alice Chen', type: 'transfer', amount: -250.00, balanceAfter: 11454.22 },
    { id: 17, date: '2026-03-25', description: 'Direct Deposit — Employer', type: 'deposit', amount: 2800.00, balanceAfter: 11704.22 },
    { id: 18, date: '2026-03-22', description: 'Restaurant — Downtown Bistro', type: 'withdrawal', amount: -86.50, balanceAfter: 8904.22 },
]

/**
 * GET /api/transactions
 * Optionally accepts a `type` filter.
 */
export async function getTransactions(type = null) {
    await mockDelay()

    if (type) {
        return MOCK_TRANSACTIONS.filter((t) => t.type === type)
    }
    return [...MOCK_TRANSACTIONS]
}
