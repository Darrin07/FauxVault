const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { vulnerabilityToggle } = require('../middleware/vulnerabilityToggle')
const accountController = require('../controllers/accountController');

router.get('/me', authenticate, vulnerabilityToggle('excessive_data_exposure'), accountController.getMyAccount);
router.post('/me', authenticate, vulnerabilityToggle('excessive_data_exposure'), accountController.updateMyAccount);
router.get('/:id', authenticate, accountController.getAccountById);

module.exports = router;
