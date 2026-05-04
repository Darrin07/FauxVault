/**
 * Tests: src/services/transfers.js
 * Verify the field names and endpoint paths for correctness
 *
 * Tested in this file:
 *  sendTransfer() uses toAccountId and not recipientId
 *  sendTransfer() calls POST /transfers
 *  getTransfers() calls GET /transfers with (no filter by default)
 *  getTransfers() appends ?type= query when filter is provided
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as transfersService from '@/services/transfers'

//Helper Function to build mockFetch
function mockFetch(body, status = 200) {
    return vi.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        text: () => Promise.resolve(JSON.stringify(body)),
    })
}

beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('token', 'test-token')
})

afterEach(() => {
    vi.restoreAllMocks()
})

describe('transfers.sendTransfer()', () => {
    const mockTransaction = {
        transaction: {
            id: 'txn-001',
            fromAccountId: 'acc-001',
            toAccountId: 'acc-002',
            amount: 100,
            reference: 'Test transfer',
            createdAt: '2024-01-15T10:00:00.000Z',
        },
    }

    it('calls POST /api/transfers', async () => {
        vi.stubGlobal('fetch', mockFetch(mockTransaction))
        await transfersService.sendTransfer({ toAccountId: 'acc-002', amount: 100, memo: 'Test' })

        expect(fetch.mock.calls[0][0]).toContain('/transfers')
        expect(fetch.mock.calls[0][1].method).toBe('POST')
    })

    it('sends toAccountId (not recipientId)', async () => {
        vi.stubGlobal('fetch', mockFetch(mockTransaction))
        await transfersService.sendTransfer({ toAccountId: 'acc-002', amount: 100 })

        const body = JSON.parse(fetch.mock.calls[0][1].body)

        expect(body).toHaveProperty('toAccountId', 'acc-002')
        // Must NOT send recipientId — that was the old field name that broke the server
        expect(body).not.toHaveProperty('recipientId')
    })

    it('inc amount in the req body', async () => {
        vi.stubGlobal('fetch', mockFetch(mockTransaction))
        await transfersService.sendTransfer({ toAccountId: 'acc-002', amount: 250.00 })

        const body = JSON.parse(fetch.mock.calls[0][1].body)
        expect(body).toHaveProperty('amount', 250.00)
    })

    it('inc optional memo if provided', async () => {
        vi.stubGlobal('fetch', mockFetch(mockTransaction))
        await transfersService.sendTransfer({ toAccountId: 'acc-002', amount: 50, memo: 'Lunch' })

        const body = JSON.parse(fetch.mock.calls[0][1].body)
        expect(body).toHaveProperty('memo', 'Lunch')
    })
})

describe('transfers.getTransfers()', () => {
    it('calls GET /api/transfers with no query string (default)', async () => {
        vi.stubGlobal('fetch', mockFetch({ transactions: [] }))
        await transfersService.getTransfers()

        const url = fetch.mock.calls[0][0]
        expect(url).toContain('/transfers')
        expect(url).not.toContain('?type=')
    })

    it('appends ?type=sent when filter is sent', async () => {
        vi.stubGlobal('fetch', mockFetch({ transactions: [] }))
        await transfersService.getTransfers('sent')

        expect(fetch.mock.calls[0][0]).toContain('/transfers?type=sent')
    })

    it('appends ?type=received if filter is received', async () => {
        vi.stubGlobal('fetch', mockFetch({ transactions: [] }))
        await transfersService.getTransfers('received')

        expect(fetch.mock.calls[0][0]).toContain('/transfers?type=received')
    })
})
