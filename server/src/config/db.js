const { Pool } = require('pg');
const config = require('./index');

const pool = new Pool(config.db);

/**
 * Executes database work on a dedicated connection with the current user's
 * identity set in PostgreSQL session state for row-level security checks.
 * Every query inside the callback must use the provided client so the session
 * variable and the SQL execute on the same connection.
 * @param {string} userId - the UUID of the logged-in user
 * @param {Function} callback - async function that receives the dedicated client
 * @returns {Promise<*>} result returned by the callback
 */
async function executeSecurely(userId, callback) {
  const client = await pool.connect();

  try {
    // set_config avoids interpolating userId into raw SQL and keeps the secure
    // session context on this dedicated connection until we explicitly reset it.
    // This matters because PostgreSQL RLS policies evaluate on the session
    // that executes the query, not on whichever session happened to authenticate
    // the request earlier in Express.
    await client.query(
      'SELECT set_config($1, $2, false)',
      ['app.current_user_id', userId]
    );

    // The callback receives the exact client that now carries
    // app.current_user_id. Any switch back to pool.query(...) inside that
    // callback would risk using a different connection and bypassing the RLS
    // context this helper just established.
    return await callback(client);
  } finally {
    // Clear the session variable before releasing the client so a later request
    // cannot inherit the previous user's security context from the pool.
    await client.query('RESET app.current_user_id');
    client.release();
  }
}

/**
 * Test the database connection. Call this at server startup,
 * not on module import, so the app can still run without
 * a database (e.g., when using the mock data layer in tests).
 */
async function testConnection() {
  try {
    await pool.query('SELECT NOW()');
    console.log('FauxVault database connected');
  } catch (err) {
    console.error('Database connection failed:', err.message);
  }
}

module.exports = { pool, testConnection, executeSecurely };
