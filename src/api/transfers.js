import { mockDelay } from './client'

/* ── In-memory transfer store ── */
let nextId = 100
const MOCK_TRANSFERS = [
    { id: 1, date: '2026-04-15', recipientId: '00287', recipientName: 'Jane Smith', amount: 500.00, memo: 'Dinner split', status: 'completed' },
    { id: 2, date: '2026-04-12', recipientId: '00287', recipientName: 'Jane Smith', amount: 150.00, memo: 'Concert tickets', status: 'completed' },
    { id: 3, date: '2026-04-08', recipientId: '00350', recipientName: 'Bob Wilson', amount: 75.00, memo: 'Books', status: 'completed' },
    { id: 4, date: '2026-04-03', recipientId: '00287', recipientName: 'Jane Smith', amount: 1200.00, memo: 'Rent share', status: 'completed' },
    { id: 5, date: '2026-03-28', recipientId: '00501', recipientName: 'Alice Chen', amount: 250.00, memo: 'Freelance work', status: 'completed' },
]

/**
 * POST /api/transfers
 */
export async function sendTransfer({ recipientId, amount, memo }) {
    await mockDelay()

    if (!recipientId || !amount || amount <= 0) {
        throw new Error('Invalid transfer details')
    }

    const transfer = {
        id: nextId++,
        date: new Date().toISOString().split('T')[0],
        recipientId,
        recipientName: `User #${recipientId}`,
        amount: Number(amount),
        memo: memo || '',
        status: 'completed',
    }

    MOCK_TRANSFERS.unshift(transfer)
    return { transfer }
}

/**
 * GET /api/transfers
 */
export async function getTransfers() {
    await mockDelay()
    return [...MOCK_TRANSFERS]
}
