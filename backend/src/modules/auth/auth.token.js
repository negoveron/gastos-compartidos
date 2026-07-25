'use strict';

const jwt = require('jsonwebtoken');

const ALGORITHM = 'HS256';

/**
 * JWT sign/verify service. `sign` deliberately excludes `nombre` from the
 * payload (only `sub` and `email` are carried). `verify` pins the allowed
 * algorithm to HS256 to avoid algorithm-confusion attacks, and lets
 * `TokenExpiredError` / `JsonWebTokenError` propagate so the caller
 * (auth.middleware.js) can map them to the correct error codes.
 *
 * @param {{ secret: string, expiresIn: string }} options
 */
function createTokenService({ secret, expiresIn }) {
  return {
    sign(user) {
      const payload = {
        sub: String(user.id),
        email: user.email,
      };
      return jwt.sign(payload, secret, { algorithm: ALGORITHM, expiresIn });
    },

    verify(token) {
      return jwt.verify(token, secret, { algorithms: [ALGORITHM] });
    },
  };
}

module.exports = { createTokenService };
