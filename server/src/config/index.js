require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3001,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    user: process.env.POSTGRES_USER || 'fauxvault_user',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.POSTGRES_DB || 'fauxvault',
    password: process.env.POSTGRES_PASSWORD || 'fauxvault_pass',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
  },
};
