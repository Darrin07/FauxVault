const request = require('supertest');
const app = require('../../src/app');
const { resetSettings } = require('../../src/models/toggleState');

beforeEach(async () => {
    await resetSettings();
});

describe('Verbose Errors Module - A02:2025', () => {
    
    describe('Hardened mode', () => {
        test('returns generic error without stack trace', async () => {
            await request(app)
                .post('/api/settings')
                .send({module_name: 'verbose_errors', is_vulnerable: false});

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

            await request(app)
                .post('/api/settings')
                .send({module_name: 'verbose_errors', is_vulnerable: true});

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
});