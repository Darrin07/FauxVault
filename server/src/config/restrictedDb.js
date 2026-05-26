/** Restricted DB pool -- used ONLY by the SQL injection vulnerability module.
 *  This pool connects as a role with BYPASSRLS plus SELECT-only grants on
 *  `transactions` and `public_accounts`. Never import this from anywhere
 *  except `transferController.js`.
 */
const { Pool } = require('pg');
const config = require('./index');

const restrictedPool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: process.env.RESTRICTED_DB_USER || 'fauxvault_sqli_lab',
  password: process.env.RESTRICTED_DB_PASSWORD,
  max: 5,
});

module.exports = { restrictedPool };
