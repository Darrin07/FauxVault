const request = require('supertest');
const app = require('../../src/app');
const { resetUsers, findUserById } = require('../../src/models/users');
const { resetAccounts } = require('../../src/models/accounts');
const { resetSettings, updateUserSetting } = require('../../src/models/toggleState');
const { extractTokenFromResponse } = require('../helpers/auth');

let userToken;
let userId;
let adminToken;
let adminId;

beforeEach(async () => {
    await resetUsers();
    await resetAccounts();
    await resetSettings();

    // Regular user
    const userRes = await request(app)
        .post('/api/auth/register')
        .send({ username: 'regularuser', email: 'regular@example.com', password: 'Password123' });

    userToken = extractTokenFromResponse(userRes);
    userId = userRes.body.user.id;

    // Admin user — register, promote in DB, then re-login to get a JWT with role:'admin'
    const adminRegRes = await request(app)
        .post('/api/auth/register')
        .send({ username: 'adminuser', email: 'admin@example.com', password: 'Password123' });

    adminId = adminRegRes.body.user.id;

    const { updateUserRole } = require('../../src/models/users');
    await updateUserRole(adminId, 'admin');

    // Re-login so the JWT reflects the updated role
    const adminLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'adminuser', password: 'Password123' });

    adminToken = extractTokenFromResponse(adminLoginRes);
});

// HARDENED MODE TESTS (privilege_escalation OFF by default)

describe('GET /api/admin/users — hardened mode', () => {
    test('blocks unauthenticated requests with 401', async () => {
        const res = await request(app).get('/api/admin/users');
        expect(res.status).toBe(401);
    });

    test('blocks regular user with 403', async () => {
        const res = await request(app)
            .get('/api/admin/users')
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('allows admin user to list all users', async () => {
        const res = await request(app)
            .get('/api/admin/users')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.users)).toBe(true);
        expect(res.body.users.length).toBeGreaterThanOrEqual(2);
        expect(res.body.users[0]).toHaveProperty('id');
        expect(res.body.users[0]).toHaveProperty('username');
        expect(res.body.users[0]).toHaveProperty('role');
        expect(res.body.users[0]).not.toHaveProperty('passwordBcrypt');
    });
});

describe('GET /api/admin/users/:id — hardened mode', () => {
    test('blocks regular user with 403', async () => {
        const res = await request(app)
            .get(`/api/admin/users/${adminId}`)
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(403);
    });

    test('returns 404 for unknown user UUID', async () => {
        const res = await request(app)
            .get('/api/admin/users/00000000-0000-0000-0000-000000000000')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
    });

    test('admin can fetch any user by id', async () => {
        const res = await request(app)
            .get(`/api/admin/users/${userId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.user.id).toBe(userId);
        expect(res.body.user.username).toBe('regularuser');
    });
});

describe('PATCH /api/admin/users/:id/role — hardened mode', () => {
    test('blocks regular user with 403', async () => {
        const res = await request(app)
            .patch(`/api/admin/users/${userId}/role`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({ role: 'admin' });

        expect(res.status).toBe(403);

        const persisted = await findUserById(userId);
        expect(persisted.role).toBe('user');
    });

    test('rejects invalid role values', async () => {
        const res = await request(app)
            .patch(`/api/admin/users/${userId}/role`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ role: 'superuser' });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });

    test('admin can promote a user to admin', async () => {
        const res = await request(app)
            .patch(`/api/admin/users/${userId}/role`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ role: 'admin' });

        expect(res.status).toBe(200);
        expect(res.body.user.role).toBe('admin');

        const persisted = await findUserById(userId);
        expect(persisted.role).toBe('admin');
    });

    test('admin can demote an admin back to user', async () => {
        const res = await request(app)
            .patch(`/api/admin/users/${adminId}/role`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ role: 'user' });

        expect(res.status).toBe(200);
        expect(res.body.user.role).toBe('user');
    });
});

// VULNERABLE MODE TESTS (privilege_escalation ON)

describe('GET /api/admin/users — vulnerable mode', () => {
    test('regular user can list all users when privilege_escalation is enabled', async () => {
        await updateUserSetting(userId, 'privilege_escalation', true);

        const res = await request(app)
            .get('/api/admin/users')
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.users)).toBe(true);
        expect(res.body.users.length).toBeGreaterThanOrEqual(2);
    });
});

describe('GET /api/admin/users/:id — vulnerable mode', () => {
    test('regular user can fetch any user profile when privilege_escalation is enabled', async () => {
        await updateUserSetting(userId, 'privilege_escalation', true);

        const res = await request(app)
            .get(`/api/admin/users/${adminId}`)
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.user.id).toBe(adminId);
    });
});

describe('PATCH /api/admin/users/:id/role — vulnerable mode', () => {
    test('regular user can escalate own privileges when privilege_escalation is enabled', async () => {
        await updateUserSetting(userId, 'privilege_escalation', true);

        const res = await request(app)
            .patch(`/api/admin/users/${userId}/role`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({ role: 'admin' });

        expect(res.status).toBe(200);
        expect(res.body.user.role).toBe('admin');

        const persisted = await findUserById(userId);
        expect(persisted.role).toBe('admin');
    });

    test('regular user can demote admin accounts when privilege_escalation is enabled', async () => {
        await updateUserSetting(userId, 'privilege_escalation', true);

        const res = await request(app)
            .patch(`/api/admin/users/${adminId}/role`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({ role: 'user' });

        expect(res.status).toBe(200);
        expect(res.body.user.role).toBe('user');
    });
});
