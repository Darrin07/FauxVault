const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const accountController = require('../controllers/accountController');

router.get('/me', authenticate, accountController.getMyAccount);
router.get('/:id', authenticate, accountController.getAccountById);

module.exports = router;
