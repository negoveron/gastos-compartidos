'use strict';

const MIN_JWT_SECRET_LENGTH = 32;

/**
 * Builds and validates the application config from a raw environment object.
 * This function is pure (no `process.env` access) so it can be unit tested
 * and reused safely — the only caller that touches `process.env` is
 * `server.js`.
 *
 * @param {NodeJS.ProcessEnv} rawEnv
 * @returns {{ ok: true, config: object } | { ok: false, errors: string[] }}
 */
function buildConfig(rawEnv = {}) {
  const errors = [];

  const port = Number.parseInt(rawEnv.PORT, 10) || 3000;
  const nodeEnv = rawEnv.NODE_ENV || 'development';
  const jwtSecret = rawEnv.JWT_SECRET || '';
  const jwtExpiresIn = rawEnv.JWT_EXPIRES_IN || '24h';
  const dbPath = rawEnv.DB_PATH || './data/gastos.db';
  const corsOrigins = (rawEnv.CORS_ORIGINS || 'http://localhost:4200')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const bcryptRounds = Number.parseInt(rawEnv.BCRYPT_ROUNDS, 10) || 10;

  if (!jwtSecret || jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    errors.push(
      `JWT_SECRET must be set and at least ${MIN_JWT_SECRET_LENGTH} characters long`
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    config: {
      port,
      nodeEnv,
      jwtSecret,
      jwtExpiresIn,
      dbPath,
      corsOrigins,
      bcryptRounds,
    },
  };
}

module.exports = { buildConfig, MIN_JWT_SECRET_LENGTH };
