/**
 * Tests the POST /api/transfers validation path when the xss_reflected module is 
 * toggled on or off.  Enabled, the server echos the raw toAccountID in the error message, 
 * a server-side reflection.  Disabled, the error message is generic and shares nothing about
 * the submitted value
 */

const request = require('supertest');
const app = require('../../src/app');
const { resetUsers } = require('../../src/models/users');
const { resetAccounts } = require('../../src/models/accounts');
const { resetSettings, updateSetting } = require('../../src/models/toggleState');
const { resetLimiters } = require('../../src/middleware/rateLimiter');

let authToken;

beforeEach(async () => {
    await resetUsers();
    await resetAccounts();
    await resetSettings();
    await resetLimiters();

    //Register and login to get a Bearer token for authenticated routes
    await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', email: 'test@example.com', password: 'TestPass123' });

    const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'test@example.com', password: 'TestPass123' });

    authToken = loginRes.body.token;

    // Reset limiters after setup requests consumed safety-net quota
    await resetLimiters();
});

// Vulnerable mode: server echoes raw toAccountId in error message

describe('Reflected XSS: vulnerable mode — server echoes raw input', () => {
    test('non-UUID toAccountId is echoed in the error message', async () => {
        await updateSetting('xss_reflected', true);

        const PAYLOAD = '<script>alert(1)</script>';

        const res = await request(app)
            .post('/api/transfers')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ toAccountId: PAYLOAD, amount: 1 });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_FAILED');
        // The raw payload appears verbatim in the error message
        expect(res.body.error.message).toContain(PAYLOAD);
    });
});

// Hardened mode: genereic error, no reflection

describe('Reflected XSS: hardened mode — generic errors', () => {
    test('non-UUID toAccountId returns generic error without echoing input', async () => {
        await updateSetting('xss_reflected', false);

        const PAYLOAD = '<script>alert(1)</script>';

        const res = await request(app)
            .post('/api/transfers')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ toAccountId: PAYLOAD, amount: 1 });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_FAILED');
        expect(res.body.error.message).toBe('toAccountId must be a valid account ID');
        // The payload must NOT appear anywhere in the response
        expect(res.body.error.message).not.toContain('<script>');
    });

    test('missing toAccountId still returns the original validation error (no regression)', async () => {
        await updateSetting('xss_reflected', false);

        const res = await request(app)
            .post('/api/transfers')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ amount: 1 });
        
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_FAILED');
        // This is the ORIGINAL missing-field message — the new UUID check
        // does not fire because the missing-field guard comes first.
        expect(res.body.error.message).toBe('toAccountId and amount are required');
    });
});

// Valid UUID: toggle does not affect correctly-formed input

describe('Reflected XSS: valid UUID passthrough', () => {
    test('valid UUID format bypasses echo — reaches transfer logic regardless of toggle', async () => {
        await updateSetting('xss_reflected', true);

        const res = await request(app)
            .post('/api/transfers')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ toAccountId: '00000000-0000-0000-0000-000000000000', amount: 1 });

        // UUID passes format check → reaches transfer logic → 404 (account not found)
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('ACCOUNT_NOT_FOUND');
        // The UUID is NOT echoed — the error comes from the transfer logic, not our validation
        expect(res.body.error.message).not.toContain('00000000');
    });
});
