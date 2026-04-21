let DEFAULT_SETTINGS = [
    { id: 1, module_name: 'sql_injection', is_vulnerable: true, updated_at: null },
    { id: 2, module_name: 'xss_stored', is_vulnerable: true, updated_at: null },
    { id: 3, module_name: 'xss_reflected', is_vulnerable: true, updated_at: null },
    { id: 4, module_name: 'brute_force', is_vulnerable: true, updated_at: null },
    { id: 5, module_name: 'verbose_errors', is_vulnerable: true, updated_at: null },
    { id: 6, module_name: 'weak_password_storage', is_vulnerable: true, updated_at: null },
    { id: 7, module_name: 'weak_session_tokens', is_vulnerable: true, updated_at: null },
    { id: 8, module_name: 'bola', is_vulnerable: true, updated_at: null },
    { id: 9, module_name: 'privilege_escalation', is_vulnerable: true, updated_at: null },
    { id: 10, module_name: 'excessive_data_exposure', is_vulnerable: true, updated_at: null },
];
let settings = DEFAULT_SETTINGS.map(s => ({ ...s }));

// get settings data
function getAllSettings() {
    return settings;
};

// update the settings, toggle vulnerable or hardened according to user wishes
function updateSetting(module_name, is_vulnerable) {
    const setting = settings.find((s) => s.module_name === module_name);

    if (!setting) {
        return null;  // module not found
    }


    setting.is_vulnerable = is_vulnerable
    setting.updated_at = new Date().toISOString();

    return setting;
};

// reset settings to original state
function resetSettings() {
    settings = DEFAULT_SETTINGS.map(s => ({ ...s }));
};

module.exports = { getAllSettings, updateSetting, resetSettings };