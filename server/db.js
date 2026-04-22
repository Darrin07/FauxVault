const { Pool } = require('pg');
require('dotenv').config();

// Manage connections
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST || 'localhost' // fallback to localhost
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
  } else {
    console.log('FauxVault Database connected');
  }
});

module.exports = pool;
