const app = require('./app');
const config = require('./config');
const pool = require('../db');

app.listen(config.port, () => {
  console.log(`FauxVault API running on port ${config.port}`);
});
