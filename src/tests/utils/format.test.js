/**
 * Tests: src/utils/format.js
 * What is tested:
 *  1. fmt()
 *    a. formats positive numbers as USD currency
 *    b. handles null and undefined safely via the ?? 0 guard
 *    c. always produces exactly 2 decimal places
 *    d. formats negative numbers with a minus sign
 *    e. formats zero correctly
 *
 *  2. formatDate()
 *    a. formats a full ISO timestamp as a readable date
 *    b. does NOT produce 'Invalid Date' (regression for the T00:00:00 bug)
 *    c. handles UTC timestamps without crashing
 *    d. returns the correct month, day, and year
 */

import { describe, it, expect } from 'vitest'
import { fmt, formatDate } from '@/utils/format'

describe('fmt()', () => {
    it('formats a whole number as USD currency', () => {
        expect(fmt(1000)).toBe('$1,000.00')
    })

    it('formats a decimal number with exactly 2 decimal places', () => {
        expect(fmt(500.5)).toBe('$500.50')
        expect(fmt(1234.56)).toBe('$1,234.56')
    })

    it('formats zero as $0.00', () => {
        expect(fmt(0)).toBe('$0.00')
    })

    it('treats null as 0 and returns $0.00', () => {
        expect(fmt(null)).toBe('$0.00')
    })

    it('treats undefined as 0 and returns $0.00', () => {
        expect(fmt(undefined)).toBe('$0.00')
    })

    it('formats negative numbers with a minus sign', () => {
        expect(fmt(-250)).toBe('-$250.00')
    })

    it('includes a thousands separator for large amounts', () => {
        expect(fmt(10000)).toBe('$10,000.00')
    })
})

describe('formatDate()', () => {
    it('formats a full ISO UTC timestamp to a readable date', () => {
        const result = formatDate('2026-04-27T15:30:00.000Z')

        expect(result).toContain('2026')

        expect(result).toContain('Apr')
    })

    it('does NOT produce "Invalid Date" — regression for T00:00:00 bug', () => {
        const result = formatDate('2026-04-27T15:30:00.000Z')
        expect(result).not.toBe('Invalid Date')
        expect(result).not.toContain('Invalid')
    })

    it('returns the correct day from the timestamp', () => {
        const result = formatDate('2026-04-27T15:30:00.000Z')
        expect(result).toContain('27')
    })

    it('handles a timestamp at midnight UTC without crashing', () => {
        const result = formatDate('2026-01-01T00:00:00.000Z')
        expect(result).not.toContain('Invalid')
        expect(result).toContain('2026')
    })

    it('handles a timestamp at end of day UTC without crashing', () => {
        const result = formatDate('2026-12-31T23:59:59.000Z')
        expect(result).not.toContain('Invalid')
        expect(result).toContain('2026')
    })
})
