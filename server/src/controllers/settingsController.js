const { getAllSettings } = require('../models/toggleState');

// GET /api/settings returns all module toggle states
async function getSettings(req, res, next) {
    try {
        const settings = await getAllSettings();
        res.json(settings);
    } catch (err) {
        next(err);
    }
}

// POST /api/settings updates a single module's toggle state
async function updateSettingHandler(req, res, next) {
    try {
        return res.status(403).json({
            error: {
                status: 403,
                message: 'Global vulnerability settings are read-only at runtime',
                code: 'SETTINGS_READ_ONLY',
            },
        });
    } catch (err) {
        next(err);
    }
}

module.exports = { getSettings, updateSettingHandler };
