const { pool } = require('../src/config/db');
const { restrictedPool } = require('../src/config/restrictedDb');

module.exports = async () => {
  await pool.end();
  await restrictedPool.end();
};
