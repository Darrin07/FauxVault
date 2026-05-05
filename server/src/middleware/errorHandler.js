const { getSettingByModule } = require('../models/toggleState');

/*
error handler middleware that checks the 'verbose_errors' toggle in the db. 
If vulnerability mode is enabled, return the full stack trace, PostgreSQL error detail,
and PostgreSQL error hint to client. If toggle lookup fails or return null, then it 
returns hardened mode as a default fail safe. Lastly, if toggled False, then hardened mode
returns a general response with no internal details exposed. 
*/
async function errorHandler(err, req, res, _next) {
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    const code = err.code || 'INTERNAL_ERROR';
  
    if (process.env.NODE_ENV !== 'test') {
      console.error(`[${code}] ${message}`, err.stack);
    }
  
    try {
      const setting = await getSettingByModule('verbose_errors');
      const isVulnerable = setting ? setting.is_vulnerable : false;

      if (isVulnerable) {
        // VULNERABLE MODE A02:2025 Security Misconfigurations - Verbose Error Messages
        return res.status(status).json({
          error: {
            status,
            message,
            code,
            stack: err.stack,             // full stack trace
            detail: err.detail || null,   // PostgreSQL error details
            hint: err.hint || null,       // PostgreSQL error hint
          },
        });
      }
    } catch (_settingsErr) {
      // toggle lookup failed, default to hardened mode
    }

    // HARDENED MODE
    res.status(status).json({
      error: {
        status,
        message,
        code,
      },
    });
  }
  
  module.exports = errorHandler;