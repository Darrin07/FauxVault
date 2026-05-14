const request = require('supertest');
const app = require('../../src/app');
const { resetUsers } = require('../../src/models/users');
const { resetAccounts } = require('../../src/models/accounts');
const { resetSettings } = require('../../src/models/toggleState');

/**
 * Extracts the JWT from Set-Cookie headers.
 * In hardened mode (weak_session_tokens OFF), the token is ONLY in the cookie,
 * not in the response body. This helper handles both modes.
 */
function extractTokenFromResponse(res) {
  // Body token (vulnerable mode)
  if (res.body.token) return res.body.token;

  // Cookie token (hardened mode) — parse from Set-Cookie header
  const cookies = res.headers['set-cookie'] || [];
  const tokenCookie = cookies.find(c => c.startsWith('token='));
  if (tokenCookie) {
    return tokenCookie.split(';')[0].replace('token=', '');
  }
  return null;
}

beforeEach(async () => {
  await resetUsers();
  await resetAccounts();
  await resetSettings();
});

describe('POST /api/auth/register', () => {
  test('creates a user and returns a token (via cookie in hardened mode)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser', email: 'test@example.com', password: 'Password123' });

    expect(res.status).toBe(201);
    const token = extractTokenFromResponse(res);
    expect(token).toBeTruthy();
    expect(res.body.user.username).toBe('testuser');
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user.role).toBe('user');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  test('rejects duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'first', email: 'dup@example.com', password: 'Pass123' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'second', email: 'dup@example.com', password: 'Pass456' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_EXISTS');
  });

  test('rejects duplicate username', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'taken', email: 'first@example.com', password: 'Pass123' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'taken', email: 'second@example.com', password: 'Pass456' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USERNAME_EXISTS');
  });

  test('rejects missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'loginuser', email: 'login@example.com', password: 'Password123' });
  });

  test('returns a token when logging in with email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'login@example.com', password: 'Password123' });

    expect(res.status).toBe(200);
    const token = extractTokenFromResponse(res);
    expect(token).toBeTruthy();
    expect(res.body.user.email).toBe('login@example.com');
    expect(res.body.user.username).toBe('loginuser');
  });

  test('returns a token when logging in with username', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'loginuser', password: 'Password123' });

    expect(res.status).toBe(200);
    const token = extractTokenFromResponse(res);
    expect(token).toBeTruthy();
    expect(res.body.user.username).toBe('loginuser');
  });

  test('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'login@example.com', password: 'WrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('rejects unknown identifier', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'nobody@example.com', password: 'Password123' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('POST /api/auth/logout', () => {
  test('returns success message', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out');
  });
  test('clears the token cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    const cookies = res.headers['set-cookie'] || [];
    const tokenCookie = cookies.find(c => c.startsWith('token='));
    expect(tokenCookie).toBeDefined();
    // Cookie should be expired (cleared)
    expect(tokenCookie).toMatch(/expires=/i);
  });
});

describe('Auth middleware', () => {
  test('protected route rejects request without token', async () => {
    const res = await request(app).get('/api/health/protected');
    expect(res.status).toBe(401);
  });

  test('protected route accepts valid token via Authorization header', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ username: 'authtest', email: 'auth@example.com', password: 'Password123' });

    const token = extractTokenFromResponse(registerRes);

    const res = await request(app)
      .get('/api/health/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('auth@example.com');
  });
});

