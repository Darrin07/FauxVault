const { createUser, findUserByEmail, findUserById, resetUsers } = require('../../src/mock/users');

beforeEach(() => {
    resetUsers();
});

describe('mock/users', ()  => {
    test('createUser stores a user and returns it with an id', () => {
        const user = createUser({
            email: 'test@test.com',
            passwordHash: 'hashhead123',
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

    test('findUserByEmail returns the correct user', () => {
        createUser({ email: 'a@test.com', passwordHash: 'xyz', name: 'A', role: 'user'});
        const found = findUserByEmail('a@test.com');
        expect(found.email).toBe('a@test.com');
    });

   test('findUserByEmail returns null for unknown email', () => {
    expect(findUserByEmail('nobody@example.com')).toBeNull();
   });

   test('findUserById returns the correct user', () => {
    const user = createUser({ email: 'b@fauxtest.com', passwordHash: 'abcd', name: 'B', role: 'user'});
    const found = findUserById(user.id);
    expect(found.email).toBe('b@fauxtest.com');
   });

   test('findUserById returns null for unknown id', () => {
    expect(findUserById('nonexistent')).toBeNull();
   });

});
