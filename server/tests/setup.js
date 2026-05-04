const { resetLimiters } = require('../src/middleware/rateLimiter');

beforeEach(async () => {
  await resetLimiters();
});
