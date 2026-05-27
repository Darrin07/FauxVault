const request = require('supertest');
const app = require('../../src/app');
const { resetUsers } = require('../../src/models/users');
const { resetAccounts } = require('../../src/models/accounts');
const { resetSettings, updateSetting } = require('../../src/models/toggleState');
const { extractTokenFromResponse } = require('../helpers/auth');

let senderToken;
let receiverAccountId;

beforeEach(async () => {
  await resetUsers();
  await resetAccounts();
  await resetSettings();

  const senderRes = await request(app)
    .post('/api/auth/register')
    .send({ username: 'sender', email: 'sender@example.com', password: 'Password123' });
  senderToken = extractTokenFromResponse(senderRes);

  const receiverRes = await request(app)
    .post('/api/auth/register')
    .send({ username: 'receiver', email: 'receiver@example.com', password: 'Password123' });
  const receiverToken = extractTokenFromResponse(receiverRes);

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

  test('filters by memo substring (case-insensitive)', async () => {
    const res = await request(app)
      .get('/api/transfers?memo=coffee')
      .set('Authorization', `Bearer ${senderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.transactions).toHaveLength(1);
    expect(res.body.transactions[0].memo).toBe('Coffee reimbursement');
  });

  test('memo filter returns empty when no transaction matches', async () => {
    const res = await request(app)
      .get('/api/transfers?memo=nonexistent')
      .set('Authorization', `Bearer ${senderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.transactions).toHaveLength(0);
  });

  test('hardened mode treats SQLi payloads in memo as literal strings', async () => {
    const payload = "' OR '1'='1' --";
    const res = await request(app)
      .get('/api/transfers?memo=' + encodeURIComponent(payload))
      .set('Authorization', `Bearer ${senderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.transactions).toHaveLength(0);
  });
});

describe('GET /api/transfers -- vulnerable mode (SQLi)', () => {
  beforeEach(async () => {
    // Sender's own transaction so non-injection vulnerable searches have rows to inspect.
    await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({ toAccountId: receiverAccountId, amount: 30, memo: 'Lunch' });

    // Register a third user (Carol) and have her send to Receiver. This creates a
    // transaction that does NOT involve sender's account, so cross-user dumps are
    // observable: hardened search by sender returns 0 rows; vulnerable WHERE-escape
    // returns Carol's transaction too.
    const carolRes = await request(app)
      .post('/api/auth/register')
      .send({ username: 'carol_sqli', email: 'carol_sqli@example.com', password: 'Password123' });
    const carolToken = extractTokenFromResponse(carolRes);

    await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${carolToken}`)
      .send({ toAccountId: receiverAccountId, amount: 17, memo: 'CarolSecret' });

    // Flip the global sql_injection toggle to TRUE. With no per-user override,
    // COALESCE in getUserSettingByModule returns the global value for any user.
    await updateSetting('sql_injection', true);
  });

  test("' OR '1'='1' -- dumps transactions across all users", async () => {
    const payload = "' OR '1'='1' --";
    const res = await request(app)
      .get('/api/transfers?memo=' + encodeURIComponent(payload))
      .set('Authorization', `Bearer ${senderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.vulnerableMode).toBe(true);
    const memos = res.body.transactions.map(t => t.memo);
    expect(memos).toEqual(expect.arrayContaining(['Lunch', 'CarolSecret']));
  });

  test('UNION exfil of public_accounts surfaces account numbers in the memo slot', async () => {
    const payload = "' UNION SELECT NULL, NULL, NULL, balance, account_number, NULL FROM public_accounts --";
    const res = await request(app)
      .get('/api/transfers?memo=' + encodeURIComponent(payload))
      .set('Authorization', `Bearer ${senderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.vulnerableMode).toBe(true);
    // Fresh-registration accounts use the FAUX-XXXXXXXX format from createAccount().
    const memos = res.body.transactions.map(t => t.memo);
    expect(memos.some(m => typeof m === 'string' && m.startsWith('FAUX-'))).toBe(true);
  });

  test('DROP TABLE attempt is blocked at the DB layer (table intact afterward)', async () => {
    const payload = "'; DROP TABLE transactions --";
    const res = await request(app)
      .get('/api/transfers?memo=' + encodeURIComponent(payload))
      .set('Authorization', `Bearer ${senderToken}`);

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('SEARCH_FAILED');

    // Confirm the transactions table still exists by reading own history again.
    const followUp = await request(app)
      .get('/api/transfers')
      .set('Authorization', `Bearer ${senderToken}`);
    expect(followUp.status).toBe(200);
  });

  test('vulnerable response shape preserves column aliases', async () => {
    const payload = "' OR '1'='1' --";
    const res = await request(app)
      .get('/api/transfers?memo=' + encodeURIComponent(payload))
      .set('Authorization', `Bearer ${senderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.vulnerableMode).toBe(true);
    expect(res.body.transactions.length).toBeGreaterThan(0);
    const t = res.body.transactions[0];
    expect(t).toHaveProperty('id');
    expect(t).toHaveProperty('fromAccountId');
    expect(t).toHaveProperty('toAccountId');
    expect(t).toHaveProperty('memo');
    expect(t).toHaveProperty('reference');
    expect(t).toHaveProperty('createdAt');
  });

  test('error-based SQLi leaks role name when verbose_errors is also on', async () => {
    await updateSetting('verbose_errors', true);

    // `CAST(... AS INT) = 1` defers the type error to runtime (the AND operand is
    // now boolean from the equality, so the parser is happy). At runtime, the CAST
    // evaluates and pg throws "invalid input syntax for type integer: ...role name...".
    const payload = "' AND CAST((SELECT current_user) AS INT) = 1 --";
    const res = await request(app)
      .get('/api/transfers?memo=' + encodeURIComponent(payload))
      .set('Authorization', `Bearer ${senderToken}`);

    expect(res.status).toBe(500);
    // Raw pg error includes the role name in `invalid input syntax for type integer: "fauxvault_sqli_lab"`.
    expect(JSON.stringify(res.body)).toContain('fauxvault_sqli_lab');
  });

  test('error-based SQLi returns generic 500 when only sql_injection is on (verbose_errors off)', async () => {
    // verbose_errors defaults to FALSE via resetSettings in the outer beforeEach;
    // only sql_injection is flipped on by this describe block's beforeEach.
    // `CAST(... AS INT) = 1` defers the type error to runtime (the AND operand is
    // now boolean from the equality, so the parser is happy). At runtime, the CAST
    // evaluates and pg throws "invalid input syntax for type integer: ...role name...".
    const payload = "' AND CAST((SELECT current_user) AS INT) = 1 --";
    const res = await request(app)
      .get('/api/transfers?memo=' + encodeURIComponent(payload))
      .set('Authorization', `Bearer ${senderToken}`);

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('SEARCH_FAILED');
    expect(JSON.stringify(res.body)).not.toContain('fauxvault_sqli_lab');
  });
});
