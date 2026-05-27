const { resetLimiters } = require('../src/middleware/rateLimiter');
const { resetSettings } = require('../src/models/toggleState');

beforeEach(async () => {
  await resetLimiters();
  await resetSettings();
});

afterEach(async () => {
  await resetSettings();
});
