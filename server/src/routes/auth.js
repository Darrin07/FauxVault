const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { vulnerabilityToggle } = require('../middleware/vulnerabilityToggle');
const { safetyNetLimiter, bruteForceLimiter } = require('../middleware/rateLimiter');

// Safety-net: unconditional rate limit on all auth routes
router.use(safetyNetLimiter);

// VULN MODULE: weak_password_storage (A02/A04) — toggle hash algorithm (plaintext/MD5 vs bcrypt)
router.post('/register', vulnerabilityToggle('weak_password_storage'), authController.register);
// VULN MODULE: brute_force (A07) — toggleable rate limiting; weak_password_storage also applied
router.post('/login', vulnerabilityToggle('weak_password_storage'), vulnerabilityToggle('brute_force'), bruteForceLimiter, authController.login);
router.post('/logout', authController.logout);

module.exports = router;