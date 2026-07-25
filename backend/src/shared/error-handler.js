'use strict';

const { AppError, InternalError } = require('./errors');

/**
 * Express error-handling middleware. Maps `AppError` instances to the
 * standard error envelope. Anything else (unexpected/unhandled errors) is
 * logged server-side and mapped to a generic 500 — the real error and stack
 * trace are NEVER leaked to the client.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);

  const internal = InternalError();
  return res.status(internal.status).json({
    error: {
      code: internal.code,
      message: internal.message,
    },
  });
}

module.exports = { errorHandler };
