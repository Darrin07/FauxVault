const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const accountController = require('../controllers/accountController');
const { vulnerabilityToggle } = require('../middleware/vulnerabilityToggle');

router.get('/me', authenticate, vulnerabilityToggle('excessive_data_exposure'), accountController.getMyAccount);
router.put('/me', authenticate, vulnerabilityToggle('excessive_data_exposure'), accountController.updateMyAccount);
router.get('/deposits', authenticate, accountController.getDeposits);
router.get('/withdrawals', authenticate, accountController.getWithdrawals);
// BOLA / IDOR module (A01 / API1): toggle picks whether the RLS session is
// bound to the requester (hardened) or to the account's owner (vulnerable).
router.get('/:id', authenticate, vulnerabilityToggle('bola'), accountController.getAccountById);


module.exports = router;
