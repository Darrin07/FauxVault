const {
  MAX_ACTIVE_VULNERABILITIES,
  getAllSettings,
  getSettingByModule,
  getUserSettingByModule,
} = require('../models/toggleState');

function parseOverrideModules(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue.flatMap(parseOverrideModules);
  }

  if (typeof rawValue !== 'string') {
    return [];
  }

  return rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function buildOverrideError(status, message, code) {
  return { status, message, code };
}

async function resolveVerboseErrorsSetting(req) {
  if (req.user?.userId) {
    return { setting: await getUserSettingByModule(req.user.userId, 'verbose_errors') };
  }

  const setting = await getSettingByModule('verbose_errors');
  const rawOverrides = req.headers['x-vulnerability-overrides']
    ?? req.query.vulnerability_overrides;

  if (rawOverrides === undefined) {
    return { setting };
  }

  const overrideModules = parseOverrideModules(rawOverrides);
  const availableSettings = await getAllSettings();
  const knownModules = new Set(availableSettings.map((item) => item.module_name));
  const unknownModules = overrideModules.filter((item) => !knownModules.has(item));

  if (unknownModules.length > 0) {
    return {
      overrideError: buildOverrideError(
        400,
        `Unknown vulnerability override module(s): ${unknownModules.join(', ')}`,
        'INVALID_VULNERABILITY_OVERRIDE'
      ),
    };
  }

  if (overrideModules.length > MAX_ACTIVE_VULNERABILITIES) {
    return {
      overrideError: buildOverrideError(
        400,
        `Anonymous overrides support at most ${MAX_ACTIVE_VULNERABILITIES} active modules`,
        'TOO_MANY_VULNERABILITY_OVERRIDES'
      ),
    };
  }

  return {
    setting: {
      ...setting,
      is_vulnerable: overrideModules.includes('verbose_errors'),
    },
  };
}

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
    const { setting, overrideError } = await resolveVerboseErrorsSetting(req);

    if (overrideError) {
      return res.status(overrideError.status).json({ error: overrideError });
    }

    const isVulnerable = setting ? setting.is_vulnerable : false;

    if (isVulnerable) {
      // VULNERABLE MODE A02:2025 Security Misconfigurations - Verbose Error Messages
      return res.status(status).json({
        error: {
          status,
          message,
          code,
          stack: err.stack,           // full stack trace
          detail: err.detail || null, // PostgreSQL error details
          hint: err.hint || null,     // PostgreSQL error hint
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
      message: status === 500 ? 'An unexpected error occurred' : message,
      code: status === 500 ? 'INTERNAL_ERROR' : code,
    },
  });
}

module.exports = errorHandler;
