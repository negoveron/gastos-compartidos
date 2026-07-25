'use strict';

const { validateRegisterInput, validateLoginInput } = require('./auth.validation');
const { ValidationError, InvalidCredentialsError } = require('../../shared/errors');

// A precomputed, valid-shaped bcrypt hash with no corresponding known
// password. Used only to keep the login timing profile identical between
// "unknown email" and "wrong password" — never used to authenticate anyone.
const DUMMY_HASH_FOR_TIMING_SAFETY =
  '$2a$10$iSOzbtoxbgtxg0qzE02q8OC8xTADgcr22S3jLszAOE9k881kCUXw2';

/**
 * Strips internal fields (`password_hash`, `created_at`) from a user row
 * before it's ever allowed to reach an HTTP response.
 */
function toPublicUser(row) {
  return {
    id: row.id,
    email: row.email,
    nombre: row.nombre === undefined ? null : row.nombre,
  };
}

/**
 * Auth use cases: register / login / getById. Receives all collaborators as
 * injected dependencies (hexagonal-lite factory-function DI) — no direct SQL,
 * hashing, or JWT calls happen here.
 *
 * @param {{
 *   userRepository: ReturnType<typeof import('./auth.repository').createAuthRepository>,
 *   passwordHasher: ReturnType<typeof import('./auth.password').createPasswordHasher>,
 *   tokenService: ReturnType<typeof import('./auth.token').createTokenService>,
 * }} deps
 */
function createAuthService({ userRepository, passwordHasher, tokenService }) {
  return {
    async register({ email, password, nombre }) {
      const result = validateRegisterInput({ email, password, nombre });
      if (!result.valid) {
        throw ValidationError(result.details);
      }

      const { email: normalizedEmail, password: rawPassword, nombre: normalizedNombre } = result.data;
      const passwordHash = await passwordHasher.hash(rawPassword);

      const row = userRepository.insertUser({
        email: normalizedEmail,
        passwordHash,
        nombre: normalizedNombre,
      });

      const user = toPublicUser(row);
      const token = tokenService.sign(user);

      return { user, token };
    },

    async login({ email, password }) {
      const result = validateLoginInput({ email, password });
      if (!result.valid) {
        throw ValidationError(result.details);
      }

      const { email: normalizedEmail, password: rawPassword } = result.data;
      const row = userRepository.findByEmail(normalizedEmail);

      if (!row) {
        // Same error for unknown email and wrong password — no distinguishing
        // signal (timing, body, or headers) between the two causes.
        await passwordHasher.compare(rawPassword, DUMMY_HASH_FOR_TIMING_SAFETY);
        throw InvalidCredentialsError();
      }

      const passwordMatches = await passwordHasher.compare(rawPassword, row.password_hash);
      if (!passwordMatches) {
        throw InvalidCredentialsError();
      }

      const user = toPublicUser(row);
      const token = tokenService.sign(user);

      return { user, token };
    },

    async getById(id) {
      const row = userRepository.findById(id);
      return row ? toPublicUser(row) : null;
    },
  };
}

module.exports = { createAuthService, toPublicUser };
