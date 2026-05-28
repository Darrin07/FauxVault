// Load .env from the project root before any module is loaded. dotenv's default
// lookup checks process.cwd(), which is /server/ when running jest from there;
// the project's .env lives one directory up. Existing tests survived without this
// because config/index.js has defaults that match the real DB values, but tests
// that need values with no safe default (e.g., the SQLi restricted role password)
// require .env to actually be present in process.env.
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '.env') });

// Set test-specific defaults before any module is loaded.
// These match the values the npm test scripts pass as env vars,
// but are also applied when running jest / test:base directly.
process.env.RATE_LIMIT_SAFETY_MAX = process.env.RATE_LIMIT_SAFETY_MAX || '5';
process.env.RATE_LIMIT_BRUTE_MAX  = process.env.RATE_LIMIT_BRUTE_MAX  || '3';
