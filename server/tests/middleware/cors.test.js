const request = require('supertest');
const app = require('../../src/app');

describe('CORS origin handling', () => {
  test('allows same-origin browser requests for the deployed host', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Host', '52.71.30.137')
      .set('Origin', 'http://52.71.30.137');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://52.71.30.137');
  });
});
