const request = require('supertest');
const app = require('../../src/app');
const { resetUsers } = require('../../src/models/users');
const { resetAccounts } = require('../../src/models/accounts');

let token;

beforeEach(async () => {
  await resetUsers();
  await resetAccounts();

  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: 'profileuser', email: 'profile@example.com', password: 'Password123' });

  token = res.body.token;
});

describe('GET /api/users/profile', () => {
  test('returns the authenticated user profile with account number', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.username).toBe('profileuser');
    expect(res.body.user.email).toBe('profile@example.com');
    expect(res.body.user.role).toBe('user');
    expect(res.body.user.accountNumber).toMatch(/^FAUX-/);
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  test('rejects unauthenticated request', async () => {
    const res = await request(app).get('/api/users/profile');
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/users/profile', () => {
  test('updates name', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name' });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('New Name');
    expect(res.body.user.username).toBe('profileuser');
  });

  test('updates email', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'new@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('new@example.com');
  });

  test('rejects duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'other', email: 'taken@example.com', password: 'Password123' });

    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'taken@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_EXISTS');
  });

  test('rejects request with no valid fields', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  test('ignores extra fields (hardened mode)', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Safe Name', role: 'admin' });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Safe Name');
    expect(res.body.user.role).toBe('user');
  });

  test('rejects unauthenticated request', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .send({ name: 'Nope' });

    expect(res.status).toBe(401);
  });
});
