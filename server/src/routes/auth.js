const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');



// VULN MODULE: Weak Passwords (A02) — toggle hash algorithm (plaintext/MD5 vs bcrypt)
router.post('/register', authController.register);
// VULN MODULE: Brute Force (A07) — add rate limiting middleware
router.post('/login', authController.login);
router.post('/logout', authController.logout);


module.exports = router;