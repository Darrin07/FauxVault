const rateLimit = require('express-rate-limit');
const config = require('../config');

/**
 * Safety-net rate limiter — always active on all auth routes.
 * Prevents resource exhaustion regardless of vulnerability toggle state.
 */
const safetyNetLimiter = rateLimit({
  windowMs: config.rateLimit.safetyWindowMs,
  limit: config.rateLimit.safetyMax,
  standardHeaders: 'draft-6',
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        status: 429,
        message: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    });
  },
});

/**
 * Brute-force rate limiter — toggleable via vulnerability settings.
 * Requires vulnerabilityToggle('brute_force') middleware to run first
 * so that req.vulnerableMode is set.
 *
 * Vulnerable mode: skip is true, no rate limiting applied.
 * Hardened mode: skip is false, rate limiting enforced.
 */
const bruteForceLimiter = rateLimit({
  windowMs: config.rateLimit.bruteWindowMs,
  limit: config.rateLimit.bruteMax,
  standardHeaders: 'draft-6',
  legacyHeaders: false,
  skip: (req) => req.vulnerableMode === true,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        status: 429,
        message: 'Too many login attempts. Try again in 5 minutes.',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    });
  },
});

/**
 * Resets in-memory hit counters for both limiters for a given key.
 * Primarily used in tests to prevent carry-over between test suites.
 *
 * @param {string} [key='127.0.0.1'] - the rate-limit store key to reset (express-rate-limit normalizes IPv4-mapped IPv6 to plain IPv4)
 * @returns {Promise<void>}
 */
async function resetLimiters(key = '127.0.0.1') {
  await safetyNetLimiter.resetKey(key);
  await bruteForceLimiter.resetKey(key);
}

module.exports = { safetyNetLimiter, bruteForceLimiter, resetLimiters };
