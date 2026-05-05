// Set test-specific defaults before any module is loaded.
// These match the values the npm test scripts pass as env vars,
// but are also applied when running jest / test:base directly.
process.env.RATE_LIMIT_SAFETY_MAX = process.env.RATE_LIMIT_SAFETY_MAX || '5';
process.env.RATE_LIMIT_BRUTE_MAX  = process.env.RATE_LIMIT_BRUTE_MAX  || '3';
