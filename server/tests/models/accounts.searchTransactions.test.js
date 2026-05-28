const request = require('supertest');
const app = require('../../src/app');
const { resetUsers } = require('../../src/models/users');
const { resetAccounts, searchTransactions } = require('../../src/models/accounts');
const { resetSettings } = require('../../src/models/toggleState');
const { executeSecurely } = require('../../src/config/db');
const { extractTokenFromResponse } = require('../helpers/auth');

let aliceToken, aliceUserId, aliceAccountId;
let bobAccountId;

beforeEach(async () => {
  await resetUsers();
  await resetAccounts();
  await resetSettings();

  // Register Alice and capture her id and account id
  const a = await request(app)
    .post('/api/auth/register')
    .send({ username: 'alice', email: 'alice@example.com', password: 'Password123' });
  aliceToken = extractTokenFromResponse(a);
  aliceUserId = a.body.user.id;
  const aliceMe = await request(app)
    .get('/api/accounts/me')
    .set('Authorization', `Bearer ${aliceToken}`);
  aliceAccountId = aliceMe.body.account.id;

  // Register Bob
  const b = await request(app)
    .post('/api/auth/register')
    .send({ username: 'bob', email: 'bob@example.com', password: 'Password123' });
  const bobToken = extractTokenFromResponse(b);
  const bobMe = await request(app)
    .get('/api/accounts/me')
    .set('Authorization', `Bearer ${bobToken}`);
  bobAccountId = bobMe.body.account.id;

  // Alice sends two transfers with distinct memos
  await request(app)
    .post('/api/transfers')
    .set('Authorization', `Bearer ${aliceToken}`)
    .send({ toAccountId: bobAccountId, amount: 50, memo: 'Rent for May' });

  await request(app)
    .post('/api/transfers')
    .set('Authorization', `Bearer ${aliceToken}`)
    .send({ toAccountId: bobAccountId, amount: 25, memo: 'Coffee reimbursement' });
});

describe('searchTransactions', () => {
  test('returns transactions where reference matches the substring (case-insensitive)', async () => {
    const results = await executeSecurely(aliceUserId, async (client) =>
      searchTransactions(aliceAccountId, 'rent', client)
    );

    expect(results).toHaveLength(1);
    expect(results[0].memo).toBe('Rent for May');
    expect(results[0].reference).toBe('Rent for May');
  });

  test('returns empty array when memo does not match', async () => {
    const results = await executeSecurely(aliceUserId, async (client) =>
      searchTransactions(aliceAccountId, 'nonexistent string', client)
    );

    expect(results).toHaveLength(0);
  });

  test('matches partial substrings on either side of the match', async () => {
    const results = await executeSecurely(aliceUserId, async (client) =>
      searchTransactions(aliceAccountId, 'Coffee', client)
    );

    expect(results).toHaveLength(1);
    expect(results[0].memo).toBe('Coffee reimbursement');
  });
});
