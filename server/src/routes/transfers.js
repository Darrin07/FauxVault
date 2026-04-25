const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const transferController = require('../controllers/transferController');


router.get('/', authenticate, transferController.getTransferHistory);
router.post('/', authenticate, transferController.createTransfer);

module.exports = router;