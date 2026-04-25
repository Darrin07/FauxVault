const request = require('supertest');
const app = require('../../src/app');
const { resetUsers } = require('../../src/mock/users');
const { resetAccounts } = require('../../src/mock/accounts');

let token;

beforeEach(async () => {
  resetUsers();
  resetAccounts();

  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: 'acctuser', email: 'acct@example.com', password: 'Password123' });

  token = res.body.token;
});

describe('GET /api/accounts/me', () => {
  test('returns the authenticated user\'s account', async () => {
    const res = await request(app)
      .get('/api/accounts/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.account).toBeDefined();
    expect(res.body.account.balance).toBe(1000);
    expect(res.body.account.accountNumber).toMatch(/^FAUX-/);
    expect(res.body.account).not.toHaveProperty('userId');
  });

  test('rejects unauthenticated request', async () => {
    const res = await request(app).get('/api/accounts/me');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/accounts/:id', () => {
  test('returns account by ID', async () => {
    const meRes = await request(app)
      .get('/api/accounts/me')
      .set('Authorization', `Bearer ${token}`);

    const accountId = meRes.body.account.id;

    const res = await request(app)
      .get(`/api/accounts/${accountId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.account.id).toBe(accountId);
  });

  test('returns 404 for nonexistent account', async () => {
    const res = await request(app)
      .get('/api/accounts/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ACCOUNT_NOT_FOUND');
  });

  test('rejects unauthenticated request', async () => {
    const res = await request(app).get('/api/accounts/some-id');
    expect(res.status).toBe(401);
  });
});
