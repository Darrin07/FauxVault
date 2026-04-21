const express = require('express');
const router = express.Router();
const sController = require('../controllers/settingsController');
const settingsController = require('../controllers/settingsController');

router.get('/', settingsController.getSettings);
router.post('/', settingsController.updateSettingHandler);
module.exports = router;