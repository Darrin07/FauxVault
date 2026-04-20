const express = require('express');
const router = express.Router();
const sController = require('../controllers/settingsController');

router.get('/', sController.getSettings);
router.post('/', sController.updateSettingHandler);

module.exports = router;