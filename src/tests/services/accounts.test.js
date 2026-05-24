/**
 * Tests: src/services/accounts.js
 * Verify if endpoint paths are correct and complete, and that response is normal.
 * Uses vi.stubGlobal for mock fetch
 *
 * Tested in this file:
 *  getBalance() --> calls GET /accounts/me
 *  getBalance() --> normalises { account: { ... } } into flattened shape
 *  getBalance() --> maps createdAt → openedAt
 *  getBalance() --> preserves accountType from the server
 *  getDeposits() --> calls GET /accounts/deposits
 *  getWithdrawals() --> calls GET /accounts/withdrawals
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as accountsService from '@/services/accounts'

// Builds our mockFetch
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

describe('accounts.getBalance()', () => {
    const serverResponse = {
        account: {
            id: 'acc-001',
            accountNumber: 'FV-USER-002',
            balance: 500.50,
            accountType: 'checking',
            createdAt: '2024-01-15T10:00:00.000Z',
        },
    }

    it('calls GET /api/accounts/me', async () => {
        vi.stubGlobal('fetch', mockFetch(serverResponse))
        await accountsService.getBalance()
        expect(fetch.mock.calls[0][0]).toContain('/accounts/me')
        expect(fetch.mock.calls[0][1].method).toBeUndefined() 
    })

    it('normalises server response into flattened shape', async () => {
        vi.stubGlobal('fetch', mockFetch(serverResponse))
        const result = await accountsService.getBalance()

        expect(result).toHaveProperty('id', 'acc-001')
        expect(result).toHaveProperty('accountNumber', 'FV-USER-002')
        expect(result).toHaveProperty('balance', 500.50)
    })

    it('maps createdAt to openedAt', async () => {
        vi.stubGlobal('fetch', mockFetch(serverResponse))
        const result = await accountsService.getBalance()

        expect(result).toHaveProperty('openedAt', '2024-01-15T10:00:00.000Z')
        expect(result).not.toHaveProperty('createdAt')
    })

    it('preserves accountType from the server response', async () => {
        vi.stubGlobal('fetch', mockFetch(serverResponse))
        const result = await accountsService.getBalance()

        expect(result).toHaveProperty('accountType', 'checking')
    })
})

describe('accounts.getDeposits()', () => {
    it('calls GET /api/accounts/deposits', async () => {
        vi.stubGlobal('fetch', mockFetch({ total: 3200, period: 'this month' }))
        await accountsService.getDeposits()
        expect(fetch.mock.calls[0][0]).toContain('/accounts/deposits')
    })

    it('returns total and period from server', async () => {
        vi.stubGlobal('fetch', mockFetch({ total: 3200, period: 'this month' }))
        const result = await accountsService.getDeposits()
        expect(result).toEqual({ total: 3200, period: 'this month' })
    })
})

describe('accounts.getWithdrawals()', () => {
    it('calls GET /api/accounts/withdrawals', async () => {
        vi.stubGlobal('fetch', mockFetch({ total: 1320, period: 'this month' }))
        await accountsService.getWithdrawals()
        expect(fetch.mock.calls[0][0]).toContain('/accounts/withdrawals')
    })
})
