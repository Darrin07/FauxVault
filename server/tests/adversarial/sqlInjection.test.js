const request = require('supertest');
const app = require('../../src/app');
const { resetUsers } = require('../../src/models/users');
const { resetAccounts } = require('../../src/models/accounts');
const { resetSettings, updateSetting } = require('../../src/models/toggleState');
const { restrictedPool } = require('../../src/config/restrictedDb');
const { extractTokenFromResponse } = require('../helpers/auth');

// ---------------------------------------------------------------------------
// SQL Injection adversarial / blast-radius
//
// These tests bypass the HTTP layer and hit `restrictedPool` directly to assert
// the database-layer security boundary. If a future change widens the role's
// grants -- accidentally granting SELECT on `users`, INSERT on `transactions`,
// or anything DDL -- the relevant test fails loudly, independent of controller
// behavior.
// ---------------------------------------------------------------------------

describe('SQL injection adversarial: restricted role blast radius', () => {
  test('can SELECT from pg_class (schema discovery is acceptable recon)', async () => {
    const r = await restrictedPool.query("SELECT count(*) AS n FROM pg_class WHERE relkind = 'r'");
    expect(Number(r.rows[0].n)).toBeGreaterThan(0);
  });

  test('cannot SELECT from pg_shadow (password hashes are unreachable)', async () => {
    await expect(
      restrictedPool.query('SELECT * FROM pg_shadow LIMIT 1')
    ).rejects.toThrow(/permission denied/i);
  });

  test('cannot SELECT from users (no grant)', async () => {
    await expect(
      restrictedPool.query('SELECT * FROM users LIMIT 1')
    ).rejects.toThrow(/permission denied/i);
  });

  test('cannot SELECT from raw accounts (only the public_accounts view)', async () => {
    await expect(
      restrictedPool.query('SELECT * FROM accounts LIMIT 1')
    ).rejects.toThrow(/permission denied/i);
  });

  test('cannot INSERT into transactions', async () => {
    await expect(
      restrictedPool.query(
        `INSERT INTO transactions (sender_account_id, receiver_account_id, amount)
         VALUES (gen_random_uuid(), gen_random_uuid(), 1)`
      )
    ).rejects.toThrow(/permission denied/i);
  });

  test('cannot DROP transactions', async () => {
    await expect(
      restrictedPool.query('DROP TABLE transactions')
    ).rejects.toThrow(/permission denied|must be owner/i);
  });
});

// ---------------------------------------------------------------------------
// HTTP-level defense in depth
// ---------------------------------------------------------------------------

describe('SQL injection adversarial: UNION against users through HTTP', () => {
  let senderToken;

  beforeEach(async () => {
    await resetUsers();
    await resetAccounts();
    await resetSettings();

    const senderRes = await request(app)
      .post('/api/auth/register')
      .send({ username: 'adv_sender', email: 'adv_sender@example.com', password: 'Password123' });
    senderToken = extractTokenFromResponse(senderRes);

    await updateSetting('sql_injection', true);
  });

  test('UNION SELECT * FROM users returns 500 SEARCH_FAILED (no leak)', async () => {
    const payload = "' UNION SELECT * FROM users --";
    const res = await request(app)
      .get('/api/transfers?memo=' + encodeURIComponent(payload))
      .set('Authorization', `Bearer ${senderToken}`);

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('SEARCH_FAILED');
    // No part of the users table should leak in the generic error body.
    expect(JSON.stringify(res.body)).not.toContain('password_bcrypt');
    expect(JSON.stringify(res.body)).not.toContain('password_md5');
    expect(JSON.stringify(res.body)).not.toContain('password_plaintext');
  });
});
