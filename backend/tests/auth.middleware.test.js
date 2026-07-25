'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const { createRequireAuth } = require('../src/modules/auth/auth.middleware');
const { createTokenService } = require('../src/modules/auth/auth.token');

const SECRET = 'a-test-secret-that-is-at-least-32-chars-long';

function buildMiddleware() {
  const tokenService = createTokenService({ secret: SECRET, expiresIn: '24h' });
  return createRequireAuth({ tokenService });
}

function fakeReq(authorizationHeader) {
  return { headers: authorizationHeader ? { authorization: authorizationHeader } : {} };
}

function captureNext() {
  const calls = [];
  const next = (err) => calls.push(err);
  return { next, calls };
}

test('requireAuth: no Authorization header -> AUTH_TOKEN_MISSING', () => {
  const requireAuth = buildMiddleware();
  const { next, calls } = captureNext();

  requireAuth(fakeReq(undefined), {}, next);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].code, 'AUTH_TOKEN_MISSING');
  assert.equal(calls[0].status, 401);
});

test('requireAuth: malformed header (not "Bearer <token>") -> AUTH_TOKEN_MALFORMED', () => {
  const requireAuth = buildMiddleware();
  const { next, calls } = captureNext();

  requireAuth(fakeReq('Token abc123'), {}, next);

  assert.equal(calls[0].code, 'AUTH_TOKEN_MALFORMED');
  assert.equal(calls[0].status, 401);
});

test('requireAuth: expired token -> AUTH_TOKEN_EXPIRED', () => {
  const requireAuth = buildMiddleware();
  const { next, calls } = captureNext();

  const expiredToken = jwt.sign({ sub: '1', email: 'a@b.com' }, SECRET, {
    algorithm: 'HS256',
    expiresIn: '-1s',
  });

  requireAuth(fakeReq(`Bearer ${expiredToken}`), {}, next);

  assert.equal(calls[0].code, 'AUTH_TOKEN_EXPIRED');
  assert.equal(calls[0].status, 401);
});

test('requireAuth: bad signature -> AUTH_TOKEN_INVALID', () => {
  const requireAuth = buildMiddleware();
  const { next, calls } = captureNext();

  const badToken = jwt.sign({ sub: '1', email: 'a@b.com' }, 'a-completely-different-secret-32-chars-min', {
    algorithm: 'HS256',
    expiresIn: '24h',
  });

  requireAuth(fakeReq(`Bearer ${badToken}`), {}, next);

  assert.equal(calls[0].code, 'AUTH_TOKEN_INVALID');
  assert.equal(calls[0].status, 401);
});

test('requireAuth: valid token -> req.user set, next() called with no error', () => {
  const requireAuth = buildMiddleware();
  const { next, calls } = captureNext();

  const token = jwt.sign({ sub: '42', email: 'valid@example.com' }, SECRET, {
    algorithm: 'HS256',
    expiresIn: '24h',
  });

  const req = fakeReq(`Bearer ${token}`);
  requireAuth(req, {}, next);

  assert.equal(calls.length, 1);
  assert.equal(calls[0], undefined);
  assert.deepEqual(req.user, { id: 42, email: 'valid@example.com' });
});
