/**
 * Tests: src/utils/normalize.js
 * Testing Map:
 *  1. normalizeTransaction()
 *    a. maps createdAt → date
 *    b. uses memo as description when present
 *    c. falls back to reference when memo is absent
 *    d. falls back to 'Transfer' when both memo and reference are absent
 *    e. prefers memo over reference when both are present
 *    f. always sets type to 'transfer'
 *    g. carries id through unchanged
 *    h. carries amount through unchanged
 */

import { describe, it, expect } from 'vitest'
import { normalizeTransaction } from '@/utils/normalize'

const BASE_TXN = {
    id: 'txn-001',
    fromAccountId: 'acc-001',
    toAccountId: 'acc-002',
    amount: 100.50,
    reference: 'Rent for May',
    memo: 'Rent for May',
    createdAt: '2026-04-27T15:30:00.000Z',
}

describe('normalizeTransaction()', () => {
    it('maps createdAt to date', () => {
        const result = normalizeTransaction(BASE_TXN)
        expect(result.date).toBe('2026-04-27T15:30:00.000Z')
        expect(result).not.toHaveProperty('createdAt')
    })

    it('uses memo as description when present', () => {
        const result = normalizeTransaction({ ...BASE_TXN, memo: 'Lunch split' })
        expect(result.description).toBe('Lunch split')
    })

    it('falls back to reference when memo is absent', () => {
        const result = normalizeTransaction({ ...BASE_TXN, memo: undefined, reference: 'Invoice #42' })
        expect(result.description).toBe('Invoice #42')
    })

    it('falls back to reference when memo is an empty string', () => {
        const result = normalizeTransaction({ ...BASE_TXN, memo: '', reference: 'Invoice #42' })
        expect(result.description).toBe('Invoice #42')
    })

    it('falls back to Transfer when both memo and reference are absent', () => {
        const result = normalizeTransaction({ ...BASE_TXN, memo: undefined, reference: undefined })
        expect(result.description).toBe('Transfer')
    })

    it('prefers memo over reference when both are present', () => {
        const result = normalizeTransaction({ ...BASE_TXN, memo: 'From memo', reference: 'From reference' })
        expect(result.description).toBe('From memo')
    })

    it('always sets type to transfer', () => {
        const result = normalizeTransaction(BASE_TXN)
        expect(result.type).toBe('transfer')
    })

    it('carries id through unchanged', () => {
        const result = normalizeTransaction(BASE_TXN)
        expect(result.id).toBe('txn-001')
    })

    it('carries amount through unchanged', () => {
        const result = normalizeTransaction(BASE_TXN)
        expect(result.amount).toBe(100.50)
    })

    it('does NOT include balanceAfter — server does not return running balance', () => {
        const result = normalizeTransaction(BASE_TXN)
        expect(result).not.toHaveProperty('balanceAfter')
    })

    it('does NOT include fromAccountId or toAccountId in the UI shape', () => {
        const result = normalizeTransaction(BASE_TXN)
        expect(result).not.toHaveProperty('fromAccountId')
        expect(result).not.toHaveProperty('toAccountId')
    })
})
