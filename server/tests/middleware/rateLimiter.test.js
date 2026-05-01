const request = require('supertest');
const app = require('../../src/app');
const { resetUsers } = require('../../src/models/users');
const { resetAccounts } = require('../../src/models/accounts');
const { resetSettings, updateSetting } = require('../../src/models/toggleState');
const { resetLimiters } = require('../../src/middleware/rateLimiter');

beforeEach(async () => {
  await resetLimiters();
  await resetUsers();
  await resetAccounts();
  await resetSettings();
});

describe('Safety-net rate limiter', () => {
  test('allows requests under the threshold', async () => {
    const res = await request(app)
      .post('/api/auth/logout');

    expect(res.status).toBe(200);
  });

  test('returns 429 when safety-net threshold is exceeded', async () => {
    // RATE_LIMIT_SAFETY_MAX is set to 5 in test env
    const requests = [];
    for (let i = 0; i < 6; i++) {
      requests.push(
        request(app)
          .post('/api/auth/logout')
      );
    }
    const responses = await Promise.all(requests);
    const blocked = responses.filter(r => r.status === 429);

    expect(blocked.length).toBeGreaterThanOrEqual(1);
    expect(blocked[0].body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});

describe('Brute-force rate limiter (hardened mode)', () => {
  beforeEach(async () => {
    await updateSetting('brute_force', false); // hardened

    // Register a user for login attempts
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'bruteuser', email: 'brute@example.com', password: 'Password123' });

    // Reset limiter counters so setup requests don't consume the test quota
    await resetLimiters();
  });

  test('allows login attempts under the threshold', async () => {
    // RATE_LIMIT_BRUTE_MAX is set to 3 in test env
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'brute@example.com', password: 'WrongPass' });

      expect(res.status).toBe(401);
    }
  });

  test('returns 429 when brute-force threshold is exceeded', async () => {
    // RATE_LIMIT_BRUTE_MAX is set to 3 in test env
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'brute@example.com', password: 'WrongPass' });
    }

    const blocked = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'brute@example.com', password: 'WrongPass' });

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(blocked.body.error.message).toMatch(/too many login attempts/i);
    expect(blocked.headers).toHaveProperty('retry-after');
  });
});

describe('Brute-force rate limiter (vulnerable mode)', () => {
  beforeEach(async () => {
    await updateSetting('brute_force', true); // vulnerable

    await request(app)
      .post('/api/auth/register')
      .send({ username: 'vulnuser', email: 'vuln@example.com', password: 'Password123' });

    // Reset limiter counters so setup requests don't consume the test quota
    await resetLimiters();
  });

  test('allows unlimited login attempts when vulnerable', async () => {
    // RATE_LIMIT_BRUTE_MAX is set to 3 in test env — send more than 3 to prove
    // the brute-force limiter is bypassed. Stay under RATE_LIMIT_SAFETY_MAX (5).
    for (let i = 0; i < 4; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'vuln@example.com', password: 'WrongPass' });

      // Should get 401 (bad creds), never 429 from brute-force limiter
      expect(res.status).toBe(401);
    }
  });
});
