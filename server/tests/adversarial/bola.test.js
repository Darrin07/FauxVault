const request = require('supertest');
const app = require('../../src/app');
const { resetUsers } = require('../../src/models/users');
const { resetAccounts } = require('../../src/models/accounts');
const { resetSettings, updateSetting } = require('../../src/models/toggleState');
const { resetLimiters } = require('../../src/middleware/rateLimiter');

let attackerToken;
let attackerUserId;
let victimUserId;
let victimAccountId;
let victimBalance;
let victimToken;

beforeEach(async () => {
  await resetUsers();
  await resetAccounts();
  await resetSettings();
  await resetLimiters();

  // Attacker: the requester whose JWT we will use for all reads.
  const attackerRes = await request(app)
    .post('/api/auth/register')
    .send({ username: 'attacker', email: 'attacker@example.com', password: 'Password123' });

  attackerToken = attackerRes.headers['set-cookie']
    ?.find(c => c.startsWith('token='))
    ?.split(';')[0]
    ?.replace('token=', '');
  attackerUserId = attackerRes.body.user.id;

  // Victim: someone else whose account ID the attacker will probe.
  const victimRes = await request(app)
    .post('/api/auth/register')
    .send({ username: 'victim', email: 'victim@example.com', password: 'Password123' });

  victimUserId = victimRes.body.user.id;
  victimToken = victimRes.headers['set-cookie']
    ?.find(c => c.startsWith('token='))
    ?.split(';')[0]
    ?.replace('token=', '');

  const victimMe = await request(app)
    .get('/api/accounts/me')
    .set('Cookie', `token=${victimToken}`);

  victimAccountId = victimMe.body.account.id;
  victimBalance = victimMe.body.account.balance;
});

// ---------------------------------------------------------------------------
// BOLA / IDOR (OWASP Web A01:2025, API Security API1:2023)
// ---------------------------------------------------------------------------

describe('Adversarial: Broken Object Level Authorization (BOLA / IDOR)', () => {
  test('hardened mode hides another user\'s account behind a 404', async () => {
    await updateSetting('bola', false);

    const res = await request(app)
      .get(`/api/accounts/${victimAccountId}`)
      .set('Cookie', `token=${attackerToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ACCOUNT_NOT_FOUND');
  });

  test('hardened mode still allows the owner to read their own account', async () => {
    await updateSetting('bola', false);

    const meRes = await request(app)
      .get('/api/accounts/me')
      .set('Cookie', `token=${attackerToken}`);
    const attackerAccountId = meRes.body.account.id;

    const res = await request(app)
      .get(`/api/accounts/${attackerAccountId}`)
      .set('Cookie', `token=${attackerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.account.id).toBe(attackerAccountId);
    expect(res.body.account).not.toHaveProperty('ownerId');
    expect(res.body.account).not.toHaveProperty('vulnerableMode');
  });

  test('vulnerable mode returns another user\'s account and leaks the owner id', async () => {
    await updateSetting('bola', true);

    const res = await request(app)
      .get(`/api/accounts/${victimAccountId}`)
      .set('Cookie', `token=${attackerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.account.id).toBe(victimAccountId);
    expect(res.body.account.ownerId).toBe(victimUserId);
    expect(res.body.account.ownerId).not.toBe(attackerUserId);
    expect(res.body.account.vulnerableMode).toBe(true);
    expect(res.body.account.balance).toBe(victimBalance);
  });

  test('vulnerable mode still 404s for a nonexistent account ID', async () => {
    await updateSetting('bola', true);

    const res = await request(app)
      .get('/api/accounts/00000000-0000-0000-0000-000000000000')
      .set('Cookie', `token=${attackerToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ACCOUNT_NOT_FOUND');
  });

  test('toggle flip alone changes the response from 404 to 200 for the same request', async () => {
    await updateSetting('bola', false);

    const before = await request(app)
      .get(`/api/accounts/${victimAccountId}`)
      .set('Cookie', `token=${attackerToken}`);

    expect(before.status).toBe(404);

    await updateSetting('bola', true);

    const after = await request(app)
      .get(`/api/accounts/${victimAccountId}`)
      .set('Cookie', `token=${attackerToken}`);

    expect(after.status).toBe(200);
    expect(after.body.account.ownerId).toBe(victimUserId);
  });
});
