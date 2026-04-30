const { Pool } = require('pg');
const config = require('./index');

const pool = new Pool(config.db);


/**
 * Executes a query within a secure session context for RLS.
 * @param {string} userId - The UUID of the logged-in user.
 * @param {Function} callback - An async function containing the database logic.
 */
async function executeSecurely(userId, callback) {
    const client = await pool.connect(); // Get a dedicated client
    try {
        await client.query(`SET app.current_user_id = '${userId}'`);
        // Pass the client to the callback so it uses the same connection
        return await callback(client); 
    } finally {
        // Always reset the variable and release the client
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
