function errorHandler(err, req, res, _next) {
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    const code = err.code || 'INTERNAL_ERROR';
  
    if (process.env.NODE_ENV !== 'test') {
      console.error(`[${code}] ${message}`, err.stack);
    }
  
    res.status(status).json({
      error: {
        status,
        message,
        code,
      },
    });
  }
  
  module.exports = errorHandler;