const request = require('supertest');
const app = require('../../src/app');
const { resetSettings } = require('../../src/models/toggleState');
const { resetUsers } = require('../../src/models/users');
const { resetAccounts } = require('../../src/models/accounts');

beforeEach(async () => {
    await resetSettings();
    await resetUsers();
    await resetAccounts();
});

// test for returning settings module
describe('GET /api/settings', () => {
    test('returns all settings modules', async () => {
        const res = await request(app)
            .get('/api/settings');

        expect(res.status).toBe(200);
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.length).toBe(10);
        expect(res.body[0]).toHaveProperty('module_key');
        expect(res.body[0]).toHaveProperty('module_name');
        expect(res.body[0]).toHaveProperty('is_vulnerable');
        expect(res.body.every((row) => row.is_vulnerable === false)).toBe(true);
    });
});

// test for updating  module
describe('POST /api/settings', () => {
    test('returns read-only error for runtime updates', async () => {
        const res = await request(app)
            .post('/api/settings')
            .send({ module_name: 'sql_injection', is_vulnerable: false });

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('SETTINGS_READ_ONLY');
    });

    test('still returns read-only for malformed payloads', async () => {
        const res = await request(app)
            .post('/api/settings')
            .send({ is_vulnerable: false });

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('SETTINGS_READ_ONLY');
    });
});

describe('GET /api/users/me/vulnerability-settings', () => {
    test('returns effective signed-in settings', async () => {
        const registerRes = await request(app)
            .post('/api/auth/register')
            .send({ username: 'toggleuser', email: 'toggleuser@example.com', password: 'Password123' });

        const res = await request(app)
            .get('/api/users/me/vulnerability-settings')
            .set('Authorization', `Bearer ${registerRes.body.token}`);

        expect(res.status).toBe(200);
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body).toHaveLength(10);
        expect(res.body[0]).toHaveProperty('global_default', false);
        expect(res.body[0]).toHaveProperty('has_user_override', false);
    });
});

describe('PUT /api/users/me/vulnerability-settings', () => {
    async function registerUser() {
        const registerRes = await request(app)
            .post('/api/auth/register')
            .send({ username: 'settingsuser', email: 'settingsuser@example.com', password: 'Password123' });

        return registerRes.body.token;
    }

    test('persists a signed-in user override', async () => {
        const token = await registerUser();
        const res = await request(app)
            .put('/api/users/me/vulnerability-settings')
            .set('Authorization', `Bearer ${token}`)
            .send({ module_name: 'sql_injection', is_vulnerable: true });

        expect(res.status).toBe(200);
        expect(res.body.setting.module_name).toBe('sql_injection');
        expect(res.body.setting.is_vulnerable).toBe(true);
        expect(res.body.autoDisabledModule).toBeNull();
    });

    test('auto-disables the oldest active module when enabling a fourth one', async () => {
        const token = await registerUser();
        const auth = { Authorization: `Bearer ${token}` };

        await request(app).put('/api/users/me/vulnerability-settings').set(auth).send({ module_name: 'sql_injection', is_vulnerable: true });
        await request(app).put('/api/users/me/vulnerability-settings').set(auth).send({ module_name: 'xss_stored', is_vulnerable: true });
        await request(app).put('/api/users/me/vulnerability-settings').set(auth).send({ module_name: 'brute_force', is_vulnerable: true });
        const res = await request(app)
            .put('/api/users/me/vulnerability-settings')
            .set(auth)
            .send({ module_name: 'verbose_errors', is_vulnerable: true });

        expect(res.status).toBe(200);
        expect(res.body.autoDisabledModule).toBe('sql_injection');
        const active = res.body.settings.filter((row) => row.is_vulnerable).map((row) => row.module_name);
        expect(active).toEqual(expect.arrayContaining(['xss_stored', 'brute_force', 'verbose_errors']));
        expect(active).not.toContain('sql_injection');
    });
});
