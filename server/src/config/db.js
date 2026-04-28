const { Pool } = require('pg');
const config = require('./index');

const pool = new Pool(config.db);

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

module.exports = { pool, testConnection };
