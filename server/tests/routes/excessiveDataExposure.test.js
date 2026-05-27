const request = require('supertest');
const app = require('../../src/app');
const { resetUsers, findUserById } = require('../../src/models/users');
const { resetAccounts } = require('../../src/models/accounts');
const { updateUserSetting } = require('../../src/models/toggleState');
const { extractTokenFromResponse } = require('../helpers/auth');

// Each beforeEach chains: resetSettings (transaction) + register (2 vuln-toggle
// pool queries + 4 user/account queries) + executeSecurely in the test body.
// That's enough sequential DB round-trips to exceed Jest's default 5 s on a
// Docker or CI database where the host is remote.
jest.setTimeout(15000);

let token;
let userId;

beforeEach(async () => {
    await resetUsers();
    await resetAccounts();

    const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', email: 'test@example.com', password: 'Password123' });

    token = extractTokenFromResponse(res);
    userId = res.body.user.id;
});

describe('Excessive Data Exposure / Mass Assignment (API3:2023)', () => {

    describe('GET /api/accounts/me - Hardened mode', () => {
        test('returns only safe fields', async () => {
            const res = await request(app)
                .get('/api/accounts/me')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.account).toHaveProperty('id');
            expect(res.body.account).toHaveProperty('accountNumber');
            expect(res.body.account).toHaveProperty('balance');
            expect(res.body.account).toHaveProperty('accountType');
            expect(res.body.account).toHaveProperty('createdAt');
            expect(res.body.account).not.toHaveProperty('userId');
            expect(res.body.account).not.toHaveProperty('user');
        });
    });

    describe('GET /api/accounts/me - Vulnerable mode', () => {
        test('returns sensitive fields including passwordBcrypt and role', async () => {
            await updateUserSetting(userId, 'excessive_data_exposure', true);

            const res = await request(app)
                .get('/api/accounts/me')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.account).toHaveProperty('accountType');
            expect(res.body.account).toHaveProperty('userId');
            expect(res.body.account).toHaveProperty('user');
            expect(res.body.account.user).toHaveProperty('passwordBcrypt');
            expect(res.body.account.user).toHaveProperty('role');
            expect(res.body.account.user).toHaveProperty('email');
        });
    });

    describe('PUT /api/accounts/me - Hardened mode', () => {
        test('ignores isAdmin field and does not escalate privileges', async () => {
            const res = await request(app)
                .put('/api/accounts/me')
                .set('Authorization', `Bearer ${token}`)
                .send({ isAdmin: true });

            expect(res.status).toBe(200);

            const persisted = await findUserById(userId);
            expect(persisted.role).toBe('user');
        });
    });

    describe('PUT /api/accounts/me - Vulnerable mode', () => {
        test('accepts isAdmin field and escalates to admin role', async () => {
            await updateUserSetting(userId, 'excessive_data_exposure', true);

            const res = await request(app)
                .put('/api/accounts/me')
                .set('Authorization', `Bearer ${token}`)
                .send({ isAdmin: true });

            expect(res.status).toBe(200);
            expect(res.body.user.role).toBe('admin');

            const persisted = await findUserById(userId);
            expect(persisted.role).toBe('admin');
        });
    });
});
