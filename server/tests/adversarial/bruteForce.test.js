const request = require('supertest');
const app = require('../../src/app');
const { resetUsers } = require('../../src/models/users');
const { resetAccounts } = require('../../src/models/accounts');
const { resetSettings, updateSetting } = require('../../src/models/toggleState');
const { resetLimiters } = require('../../src/middleware/rateLimiter');

const COMMON_PASSWORDS = [
  'password', '123456', 'admin', 'letmein', 'welcome',
  'monkey', 'dragon', 'master', 'qwerty', 'Password123',
];

beforeEach(async () => {
  await resetUsers();
  await resetAccounts();
  await resetSettings();
  await resetLimiters();

  // Register target account — password is last in COMMON_PASSWORDS list
  await request(app)
    .post('/api/auth/register')
    .send({ username: 'target', email: 'target@example.com', password: 'Password123' });

  // Reset limiters after setup request consumed safety-net quota
  await resetLimiters();
});

describe('Adversarial: brute-force attack simulation', () => {
  test('hardened mode blocks brute-force attack before correct password is found', async () => {
    await updateSetting('brute_force', false); // hardened
    // RATE_LIMIT_BRUTE_MAX=3 in test env — attacker gets blocked after 3 attempts

    let blocked = false;
    let succeeded = false;

    for (const password of COMMON_PASSWORDS) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'target@example.com', password });

      if (res.status === 429) {
        blocked = true;
        break;
      }
      if (res.status === 200) {
        succeeded = true;
        break;
      }
    }

    expect(blocked).toBe(true);
    expect(succeeded).toBe(false);
  });

  test('vulnerable mode allows brute-force attack to succeed', async () => {
    await updateSetting('brute_force', true); // vulnerable
    // No brute-force rate limiting — attacker can try all passwords.
    // Reset safety-net counter periodically since this test sends many requests
    // and we're only verifying the brute-force limiter is bypassed.

    let succeeded = false;
    let token = null;

    for (let i = 0; i < COMMON_PASSWORDS.length; i++) {
      if (i > 0 && i % 4 === 0) {
        await resetLimiters();
      }

      const res = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'target@example.com', password: COMMON_PASSWORDS[i] });

      expect(res.status).not.toBe(429); // should never be rate-limited

      if (res.status === 200) {
        succeeded = true;
        token = res.body.token;
        break;
      }
    }

    expect(succeeded).toBe(true);
    expect(token).toBeDefined();
  });
});
