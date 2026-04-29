const request = require('supertest');
const app = require('../../src/app');
const { resetUsers } = require('../../src/models/users');
const { resetAccounts } = require('../../src/models/accounts');

let senderToken;
let receiverAccountId;

beforeEach(async () => {
  await resetUsers();
  await resetAccounts();

  const senderRes = await request(app)
    .post('/api/auth/register')
    .send({ username: 'sender', email: 'sender@example.com', password: 'Password123' });
  senderToken = senderRes.body.token;

  const receiverRes = await request(app)
    .post('/api/auth/register')
    .send({ username: 'receiver', email: 'receiver@example.com', password: 'Password123' });
  const receiverToken = receiverRes.body.token;

  const acctRes = await request(app)
    .get('/api/accounts/me')
    .set('Authorization', `Bearer ${receiverToken}`);
  receiverAccountId = acctRes.body.account.id;
});

describe('POST /api/transfers', () => {
  test('creates a transfer between accounts', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({ toAccountId: receiverAccountId, amount: 100, memo: 'Rent for May' });

    expect(res.status).toBe(201);
    expect(res.body.transaction).toBeDefined();
    expect(res.body.transaction.amount).toBe(100);
    expect(res.body.transaction.reference).toBe('Rent for May');
    expect(res.body.transaction.memo).toBe('Rent for May');
  });

  test('accepts reference as an alias for memo', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({ toAccountId: receiverAccountId, amount: 125, reference: 'Invoice 1007' });

    expect(res.status).toBe(201);
    expect(res.body.transaction.reference).toBe('Invoice 1007');
    expect(res.body.transaction.memo).toBe('Invoice 1007');
  });

  test('rejects transfer with insufficient funds', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({ toAccountId: receiverAccountId, amount: 9999 });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INSUFFICIENT_FUNDS');
  });

  test('rejects missing fields', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({ amount: 100 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  test('rejects non-string memo/reference values', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({ toAccountId: receiverAccountId, amount: 100, memo: { text: 'bad' } });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  test('rejects unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .send({ toAccountId: receiverAccountId, amount: 100 });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/transfers', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({ toAccountId: receiverAccountId, amount: 50, memo: '<script>alert(1)</script>' });

    await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({ toAccountId: receiverAccountId, amount: 75, memo: 'Coffee reimbursement' });
  });

  test('returns all transactions for the user', async () => {
    const res = await request(app)
      .get('/api/transfers')
      .set('Authorization', `Bearer ${senderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.transactions).toHaveLength(2);
    expect(res.body.transactions[0]).toHaveProperty('reference');
    expect(res.body.transactions[0]).toHaveProperty('memo');
    expect(res.body.transactions[0].memo).toBe(res.body.transactions[0].reference);
  });

  test('filters by type=sent', async () => {
    const res = await request(app)
      .get('/api/transfers?type=sent')
      .set('Authorization', `Bearer ${senderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.transactions).toHaveLength(2);
    res.body.transactions.forEach(t => {
      expect(t.toAccountId).toBe(receiverAccountId);
    });
  });

  test('filters by type=received returns empty for sender', async () => {
    const res = await request(app)
      .get('/api/transfers?type=received')
      .set('Authorization', `Bearer ${senderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.transactions).toHaveLength(0);
  });

  test('rejects unauthenticated request', async () => {
    const res = await request(app).get('/api/transfers');
    expect(res.status).toBe(401);
  });
});
