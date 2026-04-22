const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const transferController = require('../controllers/transferController');


router.post('/', authenticate, transferController.createTransfer);

module.exports = router;