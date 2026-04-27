const { createUser, findUserByEmail, findUserById, resetUsers } = require('../../src/models/users');

beforeEach(async () => {
    await resetUsers();
});

describe('models/users', () => {
    test('createUser stores a user and returns it with an id', async () => {
        const user = await createUser({
            username: 'testuser',
            email: 'test@test.com',
            passwordHash: '$2b$10$fakehashfortest',
            name: 'Travis Test User',
            role: 'user',
        });
        expect(user).toMatchObject({
            email: 'test@test.com',
            name: 'Travis Test User',
            role: 'user',
        });
        expect(user.id).toBeDefined();
        expect(user.createdAt).toBeDefined();
    });

    test('findUserByEmail returns the correct user', async () => {
        await createUser({ username: 'auser', email: 'a@test.com', passwordHash: '$2b$10$fakehash', name: 'A', role: 'user' });
        const found = await findUserByEmail('a@test.com');
        expect(found.email).toBe('a@test.com');
    });

    test('findUserByEmail returns null for unknown email', async () => {
        expect(await findUserByEmail('nobody@example.com')).toBeNull();
    });

    test('findUserById returns the correct user', async () => {
        const user = await createUser({ username: 'buser', email: 'b@fauxtest.com', passwordHash: '$2b$10$fakehash', name: 'B', role: 'user' });
        const found = await findUserById(user.id);
        expect(found.email).toBe('b@fauxtest.com');
    });

    test('findUserById returns null for unknown id', async () => {
        expect(await findUserById('00000000-0000-0000-0000-000000000000')).toBeNull();
    });
});
