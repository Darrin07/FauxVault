const request = require('supertest');
const app = require('../../src/app');
const { updateSetting, updateUserSetting, resetSettings } = require('../../src/models/toggleState');
const { resetUsers } = require('../../src/models/users');
const { resetAccounts } = require('../../src/models/accounts');
const { getTokenCookie } = require('../helpers/auth');

describe('Verbose Errors Module - A02:2025', () => {
    
    describe('Hardened mode', () => {
        test('returns generic error without stack trace', async () => {
            await updateSetting('verbose_errors', false);

            const res = await request(app)
                .get('/api/dummy-route');

            expect(res.status).toBe(404);
            expect(res.body.error).toHaveProperty('status');
            expect(res.body.error).toHaveProperty('message');
            expect(res.body.error).toHaveProperty('code');
            expect(res.body.error).not.toHaveProperty('stack');
            expect(res.body.error).not.toHaveProperty('detail');
            expect(res.body.error).not.toHaveProperty('hint');
        });
    });

    describe('Vulnerable mode', () => {
        test('returns full stack trace and error details', async () => {
            await updateSetting('verbose_errors', true);

            const res = await request(app)
                .get('/api/dummy-route');

            expect(res.status).toBe(404);
            expect(res.body.error).toHaveProperty('status');
            expect(res.body.error).toHaveProperty('message');
            expect(res.body.error).toHaveProperty('code');
            expect(res.body.error).toHaveProperty('stack');
            expect(res.body.error).toHaveProperty('detail');
            expect(res.body.error).toHaveProperty('hint');
        });
    });
    
    describe('User session override', () => {
        beforeEach(async () => {
            await resetUsers();
        });

    test('returns verbose error when user override is ON and global is OFF', async () => {
        await resetAccounts();
        await resetSettings();
        // register and log in a user
        const registerRes = await request(app)
            .post('/api/auth/register')
            .send({ username: 'testuser', email: 'test@example.com', password: 'Password123' });

        const userId = registerRes.body.user.id;
        const cookie = getTokenCookie(registerRes);

        // global stays false, user override set to true
        await updateUserSetting(userId, 'verbose_errors', true);

        // trigger a 500 error as authenticated user
        const res = await request(app)
            .get('/api/accounts/definitely-not-a-uuid')
            .set('Cookie', cookie);

        expect(res.status).toBe(500);
        expect(res.body.error).toHaveProperty('stack');
        expect(res.body.error).toHaveProperty('detail');
        expect(res.body.error).toHaveProperty('hint');
    });

    test('returns hardened error when user override is OFF and global is OFF', async () => {
        await resetAccounts();
        await resetSettings();
        const registerRes = await request(app)
            .post('/api/auth/register')
            .send({ username: 'testuser2', email: 'test2@example.com', password: 'Password123' });

        const cookie = getTokenCookie(registerRes);

        const res = await request(app)
            .get('/api/accounts/definitely-not-a-uuid')
            .set('Cookie', cookie);

        expect(res.status).toBe(500);
        expect(res.body.error).not.toHaveProperty('stack');
        expect(res.body.error.message).toBe('An unexpected error occurred');
    });
    });
});