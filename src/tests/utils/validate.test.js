/**
 * Tests: src/utils/validate.js
 * Pure function unit tests — no mocking, no DOM, no React.
 *
 * Testing Map:
 *  1. validateRegistration()
 *    a. username rules check:
 *      i. required
 *      ii. minimum 3 characters
 *      iii. alphanumeric + underscore only (no spaces, no special chars)
 *      iv. valid usernames produce no username error
 *    b. email rules check:
 *      i. required
 *      ii. basic format check (must contain @ and a dot after it)
 *      iii. valid emails produce no email error
 *    c. password rules:
 *      i. required
 *      ii. minimum 8 characters
 *      iii. valid password produces no password error
 *    d. confirmPassword rules:
 *      i. must match password exactly
 *    e. clean form:
 *      i. returns empty object when all fields are valid
 */

import { describe, it, expect } from 'vitest'
import { validateRegistration } from '@/utils/validate'

// baseline valid form
const VALID_FORM = {
    username: 'john_doe',
    email: 'john@example.com',
    password: 'SecurePass1',
    confirmPassword: 'SecurePass1',
}

describe('validateRegistration() — username', () => {
    it('returns a username error when username is empty', () => {
        const errs = validateRegistration({ ...VALID_FORM, username: '' })
        expect(errs).toHaveProperty('username')
    })

    it('returns a username error when username is only whitespace', () => {
        const errs = validateRegistration({ ...VALID_FORM, username: '   ' })
        expect(errs).toHaveProperty('username')
    })

    it('returns a username error when username is fewer than 3 characters', () => {
        const errs = validateRegistration({ ...VALID_FORM, username: 'ab' })
        expect(errs.username).toContain('3 characters')
    })

    it('returns a username error when username contains a space', () => {
        const errs = validateRegistration({ ...VALID_FORM, username: 'john doe' })
        expect(errs).toHaveProperty('username')
    })

    it('returns a username error when username contains @', () => {
        const errs = validateRegistration({ ...VALID_FORM, username: 'john@doe' })
        expect(errs).toHaveProperty('username')
    })

    it('returns a username error when username contains a hyphen', () => {
        const errs = validateRegistration({ ...VALID_FORM, username: 'john-doe' })
        expect(errs).toHaveProperty('username')
    })

    it('accepts a username with only letters', () => {
        const errs = validateRegistration({ ...VALID_FORM, username: 'johndoe' })
        expect(errs).not.toHaveProperty('username')
    })

    it('accepts a username with letters, numbers, and underscores', () => {
        const errs = validateRegistration({ ...VALID_FORM, username: 'john_doe_42' })
        expect(errs).not.toHaveProperty('username')
    })

    it('accepts a username that is exactly 3 characters', () => {
        const errs = validateRegistration({ ...VALID_FORM, username: 'abc' })
        expect(errs).not.toHaveProperty('username')
    })
})

describe('validateRegistration() — email', () => {
    it('returns an email error when email is empty', () => {
        const errs = validateRegistration({ ...VALID_FORM, email: '' })
        expect(errs).toHaveProperty('email')
    })

    it('returns an email error when email has no @ symbol', () => {
        const errs = validateRegistration({ ...VALID_FORM, email: 'notanemail.com' })
        expect(errs.email).toContain('Invalid')
    })

    it('returns an email error when email has no domain after @', () => {
        const errs = validateRegistration({ ...VALID_FORM, email: 'user@' })
        expect(errs).toHaveProperty('email')
    })

    it('returns an email error when email has no dot in domain', () => {
        const errs = validateRegistration({ ...VALID_FORM, email: 'user@domain' })
        expect(errs).toHaveProperty('email')
    })

    it('accepts a standard email address', () => {
        const errs = validateRegistration({ ...VALID_FORM, email: 'test@example.com' })
        expect(errs).not.toHaveProperty('email')
    })

    it('accepts an email with a subdomain', () => {
        const errs = validateRegistration({ ...VALID_FORM, email: 'user@mail.example.com' })
        expect(errs).not.toHaveProperty('email')
    })
})

describe('validateRegistration() — password', () => {
    it('returns a password error when password is empty', () => {
        const errs = validateRegistration({ ...VALID_FORM, password: '', confirmPassword: '' })
        expect(errs).toHaveProperty('password')
    })

    it('returns a password error when password is fewer than 8 characters', () => {
        const errs = validateRegistration({ ...VALID_FORM, password: 'short', confirmPassword: 'short' })
        expect(errs.password).toContain('8')
    })

    it('does NOT return a password error at exactly 8 characters', () => {
        const errs = validateRegistration({ ...VALID_FORM, password: '12345678', confirmPassword: '12345678' })
        expect(errs).not.toHaveProperty('password')
    })

    it('accepts a password longer than 8 characters', () => {
        const errs = validateRegistration({ ...VALID_FORM, password: 'AVeryLongPassword1!', confirmPassword: 'AVeryLongPassword1!' })
        expect(errs).not.toHaveProperty('password')
    })
})

describe('validateRegistration() — confirmPassword', () => {
    it('returns a confirmPassword error when passwords do not match', () => {
        const errs = validateRegistration({ ...VALID_FORM, confirmPassword: 'DifferentPass1' })
        expect(errs).toHaveProperty('confirmPassword')
    })

    it('returns a confirmPassword error when confirmPassword is empty but password is set', () => {
        const errs = validateRegistration({ ...VALID_FORM, confirmPassword: '' })
        expect(errs).toHaveProperty('confirmPassword')
    })

    it('does NOT return a confirmPassword error when both passwords match', () => {
        const errs = validateRegistration(VALID_FORM)
        expect(errs).not.toHaveProperty('confirmPassword')
    })
})

describe('validateRegistration() — valid form', () => {
    it('returns an empty object when all fields are valid', () => {
        const errs = validateRegistration(VALID_FORM)
        expect(errs).toEqual({})
    })

    it('returns only the relevant field error when a single field fails', () => {
        const errs = validateRegistration({ ...VALID_FORM, username: 'ab' })
        expect(Object.keys(errs)).toHaveLength(1)
        expect(errs).toHaveProperty('username')
    })
})
