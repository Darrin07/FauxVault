/** User model — PostgreSQL queries */
const { pool } = require('../config/db');

/**
 * Creates a new user record in the database.
 * @param {Object} fields - user fields: username, email, passwordBcrypt, passwordPlaintext (optional), passwordMd5 (optional), name (optional), role
 * @returns {Object} the created user with generated id and timestamps
 */
async function createUser({ username, email, passwordBcrypt, passwordPlaintext, passwordMd5, name, role }) {
  const result = await pool.query(
    `INSERT INTO users (username, email, password_bcrypt, password_plaintext, password_md5, name, role)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING user_id AS id, username, email, password_bcrypt AS "passwordBcrypt", name, role, created_at AS "createdAt"`,
    [username, email, passwordBcrypt || null, passwordPlaintext || null, passwordMd5 || null, name || '', role || 'user']
  );
  return result.rows[0];
}

/**
 * Looks up a user by email address.
 * @param {string} email - the email to search for
 * @returns {Object|null} the matching user or null
 */
async function findUserByEmail(email) {
  const result = await pool.query(
    `SELECT user_id AS id, username, email, password_bcrypt AS "passwordBcrypt", name, role, created_at AS "createdAt"
     FROM users WHERE email = $1`,
    [email]
  );
  return result.rows[0] || null;
}

/**
 * Looks up a user by email, returning all three password columns.
 * Used by the weak_password_storage vulnerable code path.
 * @param {string} email
 * @returns {Object|null}
 */
async function findUserByEmailAllHashes(email) {
  const result = await pool.query(
    `SELECT user_id AS id, username, email,
            password_bcrypt AS "passwordBcrypt",
            password_md5 AS "passwordMd5",
            password_plaintext AS "passwordPlaintext",
            name, role, created_at AS "createdAt"
     FROM users WHERE email = $1`,
    [email]
  );
  return result.rows[0] || null;
}

/**
 * Looks up a user by id.
 * @param {string} id - the user UUID to search for
 * @returns {Object|null} the matching user or null
 */
async function findUserById(id) {
  const result = await pool.query(
    `SELECT user_id AS id, username, email, password_bcrypt AS "passwordBcrypt", name, role, created_at AS "createdAt"
     FROM users WHERE user_id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Looks up a user by username.
 * @param {string} username - the username to search for
 * @returns {Object|null} the matching user or null
 */
async function findUserByUsername(username) {
  const result = await pool.query(
    `SELECT user_id AS id, username, email, password_bcrypt AS "passwordBcrypt", name, role, created_at AS "createdAt"
     FROM users WHERE username = $1`,
    [username]
  );
  return result.rows[0] || null;
}

/**
 * Looks up a user by username, returning all three password columns.
 * Used by the weak_password_storage vulnerable code path.
 * @param {string} username
 * @returns {Object|null}
 */
async function findUserByUsernameAllHashes(username) {
  const result = await pool.query(
    `SELECT user_id AS id, username, email,
            password_bcrypt AS "passwordBcrypt",
            password_md5 AS "passwordMd5",
            password_plaintext AS "passwordPlaintext",
            name, role, created_at AS "createdAt"
     FROM users WHERE username = $1`,
    [username]
  );
  return result.rows[0] || null;
}

/**
 * Updates whitelisted profile fields for a user.
 * @param {string} id - the user's UUID
 * @param {Object} fields - fields to update (name, email)
 * @returns {Object|null} the updated user, or null if not found
 */
async function updateUser(id, { name, email }) {
  const result = await pool.query(
    `UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email)
     WHERE user_id = $3
     RETURNING user_id AS id, username, email, name, role, created_at AS "createdAt"`,
    [name, email, id]
  );
  return result.rows[0] || null;
}

/**
 * Clears all users from the database. Used in test teardown.
 */
async function resetUsers() {
  await pool.query('TRUNCATE users CASCADE');
}

/**
 * Returns all users. Used by admin-only endpoints to list all users
 * @returns {Array} all user records (but no passwords)
 * @requirement R2.1.2
 */
async function getAllUsers() {
  const result = await pool.query(
    `SELECT user_id AS id, username, email, name, role, created_at AS "createdAt"
     FROM users ORDER BY created_at DESC`
  );
  return result.rows;
}

/**
 * Updates a user's role.
 * Used by the mass assignment vulnerability module to demonstrate
 * how unprotected field updates can lead to privilege escalation.
 * @param {string} id - the user UUID
 * @param {string} role - the new role to assign
 * @returns {Object|null} the updated user record
 * @requirement R2.1.3
 */
async function updateUserRole(id, role) {
  const result = await pool.query(
    `UPDATE users SET role = $1 WHERE user_id = $2
     RETURNING user_id AS id, username, email, name, role, created_at AS "createdAt"`,
    [role, id]
  );
  return result.rows[0] || null;
}

module.exports = { createUser, findUserByEmail, findUserByEmailAllHashes, findUserByUsername, findUserByUsernameAllHashes, findUserById, updateUser, resetUsers, getAllUsers, updateUserRole };
