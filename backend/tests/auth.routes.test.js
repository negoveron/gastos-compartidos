'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createConnection } = require('../src/db/connection');
const { runMigrations } = require('../src/db/migrate');
const { createAuthModule } = require('../src/modules/auth');
const { createApp } = require('../src/app');

const TEST_CONFIG = {
  corsOrigins: ['http://localhost:4200'],
  jwtSecret: 'a-test-secret-that-is-at-least-32-chars-long',
  jwtExpiresIn: '24h',
  bcryptRounds: 4, // low cost so the integration suite stays fast
};

function buildTestApp() {
  const db = createConnection(':memory:');
  runMigrations(db);
  const { router: authRouter } = createAuthModule({ db, config: TEST_CONFIG });
  const app = createApp({ config: TEST_CONFIG, authRouter });
  return { app, db };
}

test('full happy path: register -> login -> me', async () => {
  const { app } = buildTestApp();

  const registerRes = await request(app).post('/api/auth/register').send({
    email: 'Happy@Example.com',
    password: 'supersecret',
    nombre: 'Happy Path',
  });

  assert.equal(registerRes.status, 201);
  assert.equal(registerRes.body.user.email, 'happy@example.com');
  assert.equal(registerRes.body.user.nombre, 'Happy Path');
  assert.equal(typeof registerRes.body.token, 'string');
  assert.equal(registerRes.body.user.password_hash, undefined);

  const loginRes = await request(app).post('/api/auth/login').send({
    email: 'happy@example.com',
    password: 'supersecret',
  });

  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.body.user.email, 'happy@example.com');
  assert.equal(typeof loginRes.body.token, 'string');

  const meRes = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${loginRes.body.token}`);

  assert.equal(meRes.status, 200);
  assert.equal(meRes.body.user.email, 'happy@example.com');
  assert.equal(meRes.body.user.nombre, 'Happy Path');
});

test('register twice with the same email -> 409 EMAIL_ALREADY_REGISTERED', async () => {
  const { app } = buildTestApp();

  await request(app).post('/api/auth/register').send({
    email: 'dupe@example.com',
    password: 'supersecret',
  });

  const secondRes = await request(app).post('/api/auth/register').send({
    email: 'dupe@example.com',
    password: 'anotherpass',
  });

  assert.equal(secondRes.status, 409);
  assert.equal(secondRes.body.error.code, 'EMAIL_ALREADY_REGISTERED');
});

test('/me without Authorization header -> 401 AUTH_TOKEN_MISSING', async () => {
  const { app } = buildTestApp();

  const res = await request(app).get('/api/auth/me');

  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'AUTH_TOKEN_MISSING');
});

test('register with password shorter than 8 chars -> 400 VALIDATION_ERROR', async () => {
  const { app } = buildTestApp();

  const res = await request(app).post('/api/auth/register').send({
    email: 'short@example.com',
    password: 'short',
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  assert.ok(Array.isArray(res.body.error.details));
});

test('login with unknown email and login with wrong password return identical bodies', async () => {
  const { app } = buildTestApp();

  await request(app).post('/api/auth/register').send({
    email: 'identical@example.com',
    password: 'supersecret',
  });

  const unknownRes = await request(app).post('/api/auth/login').send({
    email: 'nope@example.com',
    password: 'whatever123',
  });

  const wrongPassRes = await request(app).post('/api/auth/login').send({
    email: 'identical@example.com',
    password: 'wrongpass123',
  });

  assert.equal(unknownRes.status, 401);
  assert.equal(wrongPassRes.status, 401);
  assert.deepEqual(unknownRes.body, wrongPassRes.body);
});
