const request = require('supertest');
const app = require('../../src/app');
const { resetUsers } = require('../../src/models/users');
const { resetAccounts } = require('../../src/models/accounts');
const { resetSettings, updateUserSetting } = require('../../src/models/toggleState');

let token;
let userId;

beforeEach(async () => {
    await resetUsers();
    await resetAccounts();
    await resetSettings();

    const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', email: 'test@example.com', password: 'Password123' });

    token = res.body.token;
    userId = res.body.user.id;
});

describe('Excessive Data Exposure / Mass Assignment (API3:2023)', () => {

    describe('GET /api/accounts/me - Hardened mode', () => {
        test('returns only safe fields', async () => {
            await request(app)
                .post('/api/settings')
                .send({ module_name: 'excessive_data_exposure', is_vulnerable: false });

            const res = await request(app)
                .get('/api/accounts/me')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.account).toHaveProperty('id');
            expect(res.body.account).toHaveProperty('accountNumber');
            expect(res.body.account).toHaveProperty('balance');
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
            expect(res.body.account).toHaveProperty('userId');
            expect(res.body.account).toHaveProperty('user');
            expect(res.body.account.user).toHaveProperty('passwordBcrypt');
            expect(res.body.account.user).toHaveProperty('role');
            expect(res.body.account.user).toHaveProperty('email');
        });
    });

    describe('POST /api/accounts/me - Hardened mode', () => {
        test('ignores isAdmin field and does not escalate privileges', async () => {
            await request(app)
                .post('/api/settings')
                .send({ module_name: 'excessive_data_exposure', is_vulnerable: false });

            const res = await request(app)
                .post('/api/accounts/me')
                .set('Authorization', `Bearer ${token}`)
                .send({ isAdmin: true });

            expect(res.status).toBe(200);
            expect(res.body.user.role).not.toBe('admin');
        });
    });

    describe('POST /api/accounts/me - Vulnerable mode', () => {
        test('accepts isAdmin field and escalates to admin role', async () => {
            await updateUserSetting(userId, 'excessive_data_exposure', true);

            const res = await request(app)
                .post('/api/accounts/me')
                .set('Authorization', `Bearer ${token}`)
                .send({ isAdmin: true });

            expect(res.status).toBe(200);
            expect(res.body.user.role).toBe('admin');
        });
    });;
});