const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { vulnerabilityToggle } = require('../middleware/vulnerabilityToggle');
const transferController = require('../controllers/transferController');


router.get('/', authenticate, transferController.getTransferHistory);
router.post('/', authenticate, vulnerabilityToggle('xss_reflected'), transferController.createTransfer);

module.exports = router;