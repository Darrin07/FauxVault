const request = require('supertest');
const app = require('../../src/app');
const { resetUsers } = require('../../src/models/users');
const { resetAccounts } = require('../../src/models/accounts');

let token;
let token2;

beforeEach(async () => {
  await resetUsers();
  await resetAccounts();

  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: 'acctuser', email: 'acct@example.com', password: 'Password123' });

  token = res.body.token;

  const res2 = await request(app)
    .post('/api/auth/register')
    .send({ username: 'acctuser2', email: 'acct2@example.com', password: 'Password123' });

  token2 = res2.body.token;
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

describe('GET /api/accounts/deposits', () => {
  test('returns zero when no transfers received', async () => {
    const res = await request(app)
      .get('/api/accounts/deposits')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.period).toBe('this month');
  });

  test('sums incoming transfers for the current month', async () => {
    // Get user2's account ID to send money TO user1
    const meRes = await request(app)
      .get('/api/accounts/me')
      .set('Authorization', `Bearer ${token}`);
    const user1AccountId = meRes.body.account.id;

    // User2 sends $200 to user1
    await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${token2}`)
      .send({ toAccountId: user1AccountId, amount: 200 });

    // User2 sends another $150 to user1
    await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${token2}`)
      .send({ toAccountId: user1AccountId, amount: 150 });

    const res = await request(app)
      .get('/api/accounts/deposits')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(350);
    expect(res.body.period).toBe('this month');
  });

  test('rejects unauthenticated request', async () => {
    const res = await request(app).get('/api/accounts/deposits');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/accounts/withdrawals', () => {
  test('returns zero when no transfers sent', async () => {
    const res = await request(app)
      .get('/api/accounts/withdrawals')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.period).toBe('this month');
  });

  test('sums outgoing transfers for the current month', async () => {
    // Get user2's account ID so user1 can send money
    const meRes = await request(app)
      .get('/api/accounts/me')
      .set('Authorization', `Bearer ${token2}`);
    const user2AccountId = meRes.body.account.id;

    // User1 sends $300 to user2
    await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({ toAccountId: user2AccountId, amount: 300 });

    // User1 sends another $100 to user2
    await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({ toAccountId: user2AccountId, amount: 100 });

    const res = await request(app)
      .get('/api/accounts/withdrawals')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(400);
    expect(res.body.period).toBe('this month');
  });

  test('rejects unauthenticated request', async () => {
    const res = await request(app).get('/api/accounts/withdrawals');
    expect(res.status).toBe(401);
  });
});
