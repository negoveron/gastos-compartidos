'use strict';

const { createAuthRepository } = require('./auth.repository');
const { createPasswordHasher } = require('./auth.password');
const { createTokenService } = require('./auth.token');
const { createAuthService } = require('./auth.service');
const { createAuthController } = require('./auth.controller');
const { createRequireAuth } = require('./auth.middleware');
const { createAuthRoutes } = require('./auth.routes');

/**
 * Composition root for the auth module. Wires repository → hasher/token
 * services → service → controller → router in one place so nothing else in
 * the codebase needs to know how these collaborators are constructed.
 *
 * @param {{
 *   db: import('better-sqlite3').Database,
 *   config: { jwtSecret: string, jwtExpiresIn: string, bcryptRounds: number },
 * }} deps
 */
function createAuthModule({ db, config }) {
  const userRepository = createAuthRepository(db);
  const passwordHasher = createPasswordHasher({ rounds: config.bcryptRounds });
  const tokenService = createTokenService({
    secret: config.jwtSecret,
    expiresIn: config.jwtExpiresIn,
  });

  const authService = createAuthService({ userRepository, passwordHasher, tokenService });
  const authController = createAuthController({ authService });
  const requireAuth = createRequireAuth({ tokenService });
  const router = createAuthRoutes({ authController, requireAuth });

  return { router, authService, requireAuth };
}

module.exports = { createAuthModule };
