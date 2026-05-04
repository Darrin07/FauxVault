const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const accountController = require('../controllers/accountController');

router.get('/me', authenticate, accountController.getMyAccount);
router.get('/deposits', authenticate, accountController.getDeposits);
router.get('/withdrawals', authenticate, accountController.getWithdrawals);
// VULN MODULE: BOLA/IDOR (A01) — add vulnerabilityToggle + ownership check
router.get('/:id', authenticate, accountController.getAccountById);

module.exports = router;
