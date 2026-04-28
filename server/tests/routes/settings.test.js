const request = require('supertest');
const app = require('../../src/app');
const { resetSettings } = require('../../src/models/toggleState');

beforeEach(async () => {
    await resetSettings();
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
    });
});

// test for updating  module
describe('POST /api/settings', () => {
    test('updates a module toggle state', async () => {
        const res = await request(app)
            .post('/api/settings')
            .send({ module_name: 'sql_injection', is_vulnerable: false });

        expect(res.status).toBe(200);
        expect(res.body.module_name).toBe('sql_injection');
        expect(res.body.is_vulnerable).toBe(false);
        expect(res.body.updated_at).not.toBeNull();
    });

    // test for missing module name
    test('missing module name', async () => {
        const res = await request(app)
            .post('/api/settings')
            .send({ is_vulnerable: false });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_FAILED')
    });

    // test for missing vulberable state
    test('missing is_vulnerable', async () => {
        const res = await request(app)
            .post('/api/settings')
            .send({ module_name: 'sql_injection' });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_FAILED')
    });

    // test for unknown module
    test('module is not found', async () => {
        const res = await request(app)
            .post('/api/settings')
            .send({ module_name: 'DDOS', is_vulnerable: false });

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('MODULE_NOT_FOUND')
    });
});
