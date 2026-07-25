'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createAuthService } = require('../src/modules/auth/auth.service');
const { createPasswordHasher } = require('../src/modules/auth/auth.password');
const { createTokenService } = require('../src/modules/auth/auth.token');
const { AppError, EmailAlreadyRegisteredError } = require('../src/shared/errors');

/**
 * A minimal in-memory fake of the auth repository contract, so these are
 * true unit tests against `auth.service.js` with no real DB involved.
 */
function createFakeUserRepository() {
  const usersByEmail = new Map();
  let nextId = 1;

  return {
    insertUser({ email, passwordHash, nombre }) {
      if (usersByEmail.has(email)) {
        throw EmailAlreadyRegisteredError();
      }
      const row = {
        id: nextId++,
        email,
        password_hash: passwordHash,
        nombre: nombre ?? null,
        created_at: new Date().toISOString(),
      };
      usersByEmail.set(email, row);
      return row;
    },
    findByEmail(email) {
      return usersByEmail.get(email) || null;
    },
    findById(id) {
      for (const row of usersByEmail.values()) {
        if (row.id === id) return row;
      }
      return null;
    },
  };
}

function buildService() {
  const userRepository = createFakeUserRepository();
  const passwordHasher = createPasswordHasher({ rounds: 4 }); // low cost, fast tests
  const tokenService = createTokenService({
    secret: 'a-test-secret-that-is-at-least-32-chars-long',
    expiresIn: '24h',
  });
  const authService = createAuthService({ userRepository, passwordHasher, tokenService });
  return { authService, userRepository };
}

test('register: succeeds and returns a user + token, password never exposed', async () => {
  const { authService } = buildService();

  const result = await authService.register({
    email: 'Ada@Example.com',
    password: 'supersecret',
    nombre: '  Ada Lovelace  ',
  });

  assert.equal(result.user.email, 'ada@example.com');
  assert.equal(result.user.nombre, 'Ada Lovelace');
  assert.equal(typeof result.user.id, 'number');
  assert.equal(result.user.password_hash, undefined);
  assert.equal(result.user.created_at, undefined);
  assert.equal(typeof result.token, 'string');
  assert.ok(result.token.split('.').length === 3, 'token looks like a JWT');
});

test('register: nombre is optional and defaults to null', async () => {
  const { authService } = buildService();

  const result = await authService.register({
    email: 'noname@example.com',
    password: 'supersecret',
  });

  assert.equal(result.user.nombre, null);
});

test('register: duplicate email throws EmailAlreadyRegisteredError (409)', async () => {
  const { authService } = buildService();

  await authService.register({ email: 'dupe@example.com', password: 'supersecret' });

  await assert.rejects(
    () => authService.register({ email: 'DUPE@example.com', password: 'anotherpass' }),
    (err) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.status, 409);
      assert.equal(err.code, 'EMAIL_ALREADY_REGISTERED');
      return true;
    }
  );
});

test('register: password shorter than 8 chars is rejected with VALIDATION_ERROR (400)', async () => {
  const { authService } = buildService();

  await assert.rejects(
    () => authService.register({ email: 'short@example.com', password: 'short' }),
    (err) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.status, 400);
      assert.equal(err.code, 'VALIDATION_ERROR');
      assert.ok(Array.isArray(err.details));
      assert.ok(err.details.some((d) => d.field === 'password'));
      return true;
    }
  );
});

test('login: succeeds with correct credentials', async () => {
  const { authService } = buildService();
  await authService.register({ email: 'login@example.com', password: 'supersecret' });

  const result = await authService.login({ email: 'login@example.com', password: 'supersecret' });

  assert.equal(result.user.email, 'login@example.com');
  assert.equal(typeof result.token, 'string');
});

test('login: unknown email and wrong password return the exact same error', async () => {
  const { authService } = buildService();
  await authService.register({ email: 'known@example.com', password: 'supersecret' });

  let unknownEmailError;
  let wrongPasswordError;

  await assert.rejects(
    () => authService.login({ email: 'unknown@example.com', password: 'whatever' }),
    (err) => {
      unknownEmailError = err;
      return true;
    }
  );

  await assert.rejects(
    () => authService.login({ email: 'known@example.com', password: 'wrong-password' }),
    (err) => {
      wrongPasswordError = err;
      return true;
    }
  );

  assert.equal(unknownEmailError.status, 401);
  assert.equal(unknownEmailError.code, 'INVALID_CREDENTIALS');
  assert.equal(wrongPasswordError.status, 401);
  assert.equal(wrongPasswordError.code, 'INVALID_CREDENTIALS');
  assert.equal(unknownEmailError.message, wrongPasswordError.message);
  assert.equal(unknownEmailError.code, wrongPasswordError.code);
});
