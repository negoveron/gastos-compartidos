'use strict';

const {
  AuthTokenMissingError,
  AuthTokenMalformedError,
  AuthTokenExpiredError,
  AuthTokenInvalidError,
} = require('../../shared/errors');

const BEARER_RE = /^Bearer (.+)$/;

/**
 * Express middleware factory enforcing the `requireAuth` branch table:
 *  - no `Authorization` header       → AUTH_TOKEN_MISSING
 *  - header not `Bearer <token>`     → AUTH_TOKEN_MALFORMED
 *  - `TokenExpiredError`             → AUTH_TOKEN_EXPIRED
 *  - any other verify error          → AUTH_TOKEN_INVALID
 *  - success                        → req.user = { id, email }
 *
 * @param {{ tokenService: ReturnType<typeof import('./auth.token').createTokenService> }} deps
 */
function createRequireAuth({ tokenService }) {
  return function requireAuth(req, res, next) {
    const header = req.headers.authorization;

    if (!header) {
      return next(AuthTokenMissingError());
    }

    const match = BEARER_RE.exec(header);
    if (!match) {
      return next(AuthTokenMalformedError());
    }

    const token = match[1];

    try {
      const payload = tokenService.verify(token);
      req.user = { id: Number(payload.sub), email: payload.email };
      return next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(AuthTokenExpiredError());
      }
      return next(AuthTokenInvalidError());
    }
  };
}

module.exports = { createRequireAuth };
