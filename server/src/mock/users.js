/** in memory user store, placeholder until postgresql is connected.  */
const crypto = require('node:crypto');

let users = [];


/**
 * Creates a new user record in the in memory store
 * @param {Object} fields - user fields: username, email, passwordHash, name (optional), role
 * @returns {Object} the created user with generated id and timestamps
 */
function createUser({ username, email, passwordHash, name, role }){
    const user = {
        id: crypto.randomUUID(),
        username,
        email,
        passwordHash,
        name: name || '',
        role: role || 'user',
        createdAt: new Date().toISOString(),
    };
    users.push(user);
    return user;
}

/**
 * Looks up a user by email address
 * @param {string} email - the email to search for
 * @returns {Object | null} the matching user or null
 */
function findUserByEmail(email) {
    return users.find((u) => u.email === email) || null;
}

/**
 * Looks up a user by id
 * @param {string} id - the user ID to search for
 * @returns {Object | null} the matching user or null
 */
function findUserById(id){
    return users.find((u) => u.id === id) || null;
}

/**
 * Clears all users from the store. used in test teardown.
 */
function resetUsers(){
    users = [];
}

/**
 * Looks up a user by username
 * @param {string} username - the username to search for
 * @returns {Object | null} the matching user or null
 */
function findUserByUsername(username) {
    return users.find((u) => u.username === username) || null;
}

module.exports = { createUser, findUserByEmail, findUserByUsername, findUserById, resetUsers };