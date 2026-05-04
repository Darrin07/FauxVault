const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { vulnerabilityToggle } = require('../middleware/vulnerabilityToggle');
const { safetyNetLimiter, bruteForceLimiter } = require('../middleware/rateLimiter');

// Safety-net: unconditional rate limit on all auth routes
router.use(safetyNetLimiter);

// VULN MODULE: Weak Passwords (A02) — toggle hash algorithm (plaintext/MD5 vs bcrypt)
router.post('/register', authController.register);
// VULN MODULE: Brute Force (A07) — toggleable rate limiting
router.post('/login', vulnerabilityToggle('brute_force'), bruteForceLimiter, authController.login);
router.post('/logout', authController.logout);

module.exports = router;