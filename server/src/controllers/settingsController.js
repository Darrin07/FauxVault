const { getAllSettings, updateSetting: updateSettingStored } = require('../mock/toggleState');

// GET /api/settings - returns all module toggle states
async function getSettings(req, res, next) {
    try {
        const settings = getAllSettings();
        res.json(settings);
    } catch (err) {
        next(err);
    }
}

// POST /api/settings - updates a single module's toggle state
async function updateSettingHandler(req, res, next) {
    try {
        const { module_name, is_vulnerable } = req.body;

        if (!module_name || is_vulnerable === undefined) {
            return res.status(400).json({
                error: { status: 400, message: 'module_name and is_vulnerable are required', code: 'VALIDATION_FAILED' },
            });
        }

        const result = updateSettingStored(module_name, is_vulnerable);

        if (!result) {
            return res.status(404).json({
                error: { status: 404, message: 'Module not found', code: 'MODULE_NOT_FOUND' },
            });
        }

        res.json(result);
    } catch (err) {
        next(err);
    }
}

module.exports = { getSettings, updateSettingHandler };