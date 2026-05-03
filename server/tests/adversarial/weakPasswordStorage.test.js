const crypto = require('crypto');
const request = require('supertest');
const app = require('../../src/app');
const { resetUsers } = require('../../src/models/users');
const { resetAccounts } = require('../../src/models/accounts');
const { resetSettings, updateSetting } = require('../../src/models/toggleState');
const { resetLimiters } = require('../../src/middleware/rateLimiter');

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

beforeEach(async () => {
  await resetUsers();
  await resetAccounts();
  await resetSettings();
  await resetLimiters();
});

// ---------------------------------------------------------------------------
// R2.3.1 Dual storage: plaintext + MD5 written in vulnerable mode
// ---------------------------------------------------------------------------

describe('R2.3.1 — Dual password storage', () => {
  test('vulnerable mode: register response exposes hashInfo with all three formats', async () => {
    await updateSetting('weak_password_storage', true);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'alice@example.com', password: 'Secret123' });

    expect(res.status).toBe(201);
    expect(res.body.hashInfo).toBeDefined();
    expect(res.body.hashInfo.vulnerableMode).toBe(true);
    expect(res.body.hashInfo.storedFormats).toEqual(expect.arrayContaining(['plaintext', 'md5', 'bcrypt']));
    expect(res.body.hashInfo.plaintext).toBe('Secret123');
    expect(res.body.hashInfo.md5).toBe(md5('Secret123'));
    expect(res.body.hashInfo.bcrypt).toMatch(/^\$2[ab]\$/);
  });

  test('hardened mode: register response does not expose hashInfo', async () => {
    await updateSetting('weak_password_storage', false);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'bob', email: 'bob@example.com', password: 'Secret456' });

    expect(res.status).toBe(201);
    expect(res.body.hashInfo).toBeUndefined();
  });

  test('response never exposes raw password fields in the user object', async () => {
    for (const vuln of [true, false]) {
      await updateSetting('weak_password_storage', vuln);
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: `u_${vuln}`, email: `u_${vuln}@example.com`, password: 'Pass999' });

      expect(res.body.user).not.toHaveProperty('passwordBcrypt');
      expect(res.body.user).not.toHaveProperty('passwordMd5');
      expect(res.body.user).not.toHaveProperty('passwordPlaintext');
    }
  });
});

// ---------------------------------------------------------------------------
// R4.2.1 Vulnerable login: MD5 comparison, hashInfo in response
// ---------------------------------------------------------------------------

describe('R4.2.1 — Vulnerable login path (MD5 comparison)', () => {
  beforeEach(async () => {
    await updateSetting('weak_password_storage', true);
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'victim', email: 'victim@example.com', password: 'Letmein99' });
    await resetLimiters();
  });

  test('login succeeds via MD5 comparison in vulnerable mode', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'victim@example.com', password: 'Letmein99' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('login response exposes hashInfo with MD5 details in vulnerable mode', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'victim@example.com', password: 'Letmein99' });

    expect(res.body.hashInfo).toBeDefined();
    expect(res.body.hashInfo.vulnerableMode).toBe(true);
    expect(res.body.hashInfo.comparisonMethod).toBe('md5');
    expect(res.body.hashInfo.submittedMd5).toBe(md5('Letmein99'));
    expect(res.body.hashInfo.storedMd5).toBe(md5('Letmein99'));
    expect(res.body.hashInfo.storedPlaintext).toBe('Letmein99');
  });

  test('login by username also works in vulnerable mode', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'victim', password: 'Letmein99' });

    expect(res.status).toBe(200);
    expect(res.body.hashInfo.comparisonMethod).toBe('md5');
  });

  test('wrong password is rejected even in vulnerable mode', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'victim@example.com', password: 'WrongPassword' });

    expect(res.status).toBe(401);
  });

  // Simulates an attacker who obtained the MD5 hash from a DB dump and
  // pre-computed the plaintext via rainbow table or brute-force.
  test('exploitation: MD5 hash is trivially reversible for common passwords', async () => {
    const COMMON_PASSWORDS = ['password', '123456', 'letmein', 'Letmein99', 'admin'];
    const targetMd5 = md5('Letmein99');

    const cracked = COMMON_PASSWORDS.find(p => md5(p) === targetMd5);
    expect(cracked).toBe('Letmein99');

    // Attacker can now log in with the cracked password
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'victim@example.com', password: cracked });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// R4.2.2 Hardened login: bcrypt comparison, no hashInfo
// ---------------------------------------------------------------------------

describe('R4.2.2 — Hardened login path (bcrypt comparison)', () => {
  beforeEach(async () => {
    await updateSetting('weak_password_storage', false);
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'hardened', email: 'hardened@example.com', password: 'StrongPass1' });
    await resetLimiters();
  });

  test('login succeeds via bcrypt in hardened mode', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'hardened@example.com', password: 'StrongPass1' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('login response does not expose hashInfo in hardened mode', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'hardened@example.com', password: 'StrongPass1' });

    expect(res.body.hashInfo).toBeUndefined();
  });

  test('wrong password is rejected in hardened mode', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'hardened@example.com', password: 'WrongPassword' });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Cross-mode: switching toggle between register and login
// ---------------------------------------------------------------------------

describe('Toggle switching between register and login', () => {
  test('user registered in vulnerable mode can still log in after switching to hardened', async () => {
    // Register in vulnerable mode - MD5 and plaintext columns populated, bcrypt also stored
    await updateSetting('weak_password_storage', true);
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'switcher', email: 'switcher@example.com', password: 'FlipFlop1' });
    await resetLimiters();

    // Switch to hardened - login must use bcrypt
    await updateSetting('weak_password_storage', false);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'switcher@example.com', password: 'FlipFlop1' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.hashInfo).toBeUndefined();
  });
});
