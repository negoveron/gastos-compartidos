'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

const { createExpensesModule } = require('../src/modules/expenses');
const { createRequireAuth } = require('../src/modules/auth/auth.middleware');
const { createTokenService } = require('../src/modules/auth/auth.token');
const { createConnection } = require('../src/db/connection');
const { runMigrations } = require('../src/db/migrate');

function createTestDb() {
  const db = createConnection(':memory:');
  runMigrations(db);
  // Seed users and groups for FK constraints
  const insertUser = db.prepare('INSERT INTO users (id, email, password_hash, nombre) VALUES (?, ?, ?, ?)');
  insertUser.run(1, 'user1@test.com', 'hash', 'User 1');
  insertUser.run(2, 'user2@test.com', 'hash', 'User 2');
  insertUser.run(3, 'user3@test.com', 'hash', 'User 3');
  insertUser.run(4, 'user4@test.com', 'hash', 'User 4');
  const insertGroup = db.prepare('INSERT INTO groups (id, nombre, owner_id) VALUES (?, ?, ?)');
  insertGroup.run(1, 'Group 1', 1);
  insertGroup.run(2, 'Group 2', 3);
  const insertMember = db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)');
  insertMember.run(1, 1);
  insertMember.run(1, 2);
  insertMember.run(1, 3);
  insertMember.run(2, 3);
  insertMember.run(2, 4);
  return db;
}

function buildApp(db) {
  const tokenService = createTokenService({ secret: 'test-secret', expiresIn: '1h' });
  const requireAuth = createRequireAuth({ tokenService });

  const { router } = createExpensesModule({ db, requireAuth });

  const app = express();
  app.use(express.json());
  app.use('/api', router);
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || 'Error interno del servidor',
        details: err.details,
      },
    });
  });

  return { app, tokenService };
}

function createAuthToken(tokenService, userId) {
  return tokenService.sign({ id: userId, email: `user${userId}@test.com` });
}

test('POST /groups/:id/expenses: creates expense with valid auth', async () => {
  const db = createTestDb();
  const { app, tokenService } = buildApp(db);
  const token = createAuthToken(tokenService, 1);

  const res = await request(app)
    .post('/api/groups/1/expenses')
    .set('Authorization', `Bearer ${token}`)
    .send({ amountCents: 30000, description: 'Cena' })
    .expect(201);

  assert.ok(res.body.id);
  assert.equal(res.body.groupId, 1);
  assert.equal(res.body.payerId, 1);
  assert.equal(res.body.amountCents, 30000);
  assert.equal(res.body.description, 'Cena');
  assert.equal(res.body.splits.length, 3);
  const total = res.body.splits.reduce((sum, s) => sum + s.amountCents, 0);
  assert.equal(total, 30000);
});

test('POST /groups/:id/expenses: rejects unauthenticated request', async () => {
  const db = createTestDb();
  const { app } = buildApp(db);

  await request(app)
    .post('/api/groups/1/expenses')
    .send({ amountCents: 30000, description: 'Cena' })
    .expect(401);
});

test('POST /groups/:id/expenses: rejects non-member', async () => {
  const db = createTestDb();
  const { app, tokenService } = buildApp(db);
  const token = createAuthToken(tokenService, 4); // User 4 not in group 1

  await request(app)
    .post('/api/groups/1/expenses')
    .set('Authorization', `Bearer ${token}`)
    .send({ amountCents: 30000, description: 'Cena' })
    .expect(403);
});

test('POST /groups/:id/expenses: validates amountCents', async () => {
  const db = createTestDb();
  const { app, tokenService } = buildApp(db);
  const token = createAuthToken(tokenService, 1);

  await request(app)
    .post('/api/groups/1/expenses')
    .set('Authorization', `Bearer ${token}`)
    .send({ amountCents: 0, description: 'Cena' })
    .expect(400);
});

test('POST /groups/:id/expenses: validates description', async () => {
  const db = createTestDb();
  const { app, tokenService } = buildApp(db);
  const token = createAuthToken(tokenService, 1);

  await request(app)
    .post('/api/groups/1/expenses')
    .set('Authorization', `Bearer ${token}`)
    .send({ amountCents: 30000, description: '' })
    .expect(400);
});

test('GET /groups/:id/balances: returns detailed balance breakdown', async () => {
  const db = createTestDb();
  const { app, tokenService } = buildApp(db);
  const token = createAuthToken(tokenService, 1);

  // Create expense: User 1 pays 30000 for 3 people
  await request(app)
    .post('/api/groups/1/expenses')
    .set('Authorization', `Bearer ${token}`)
    .send({ amountCents: 30000, description: 'Cena' })
    .expect(201);

  // User 2 pays 10000 to User 1
  const token2 = createAuthToken(tokenService, 2);
  await request(app)
    .post('/api/groups/1/settlements')
    .set('Authorization', `Bearer ${token2}`)
    .send({ payeeId: 1, amountCents: 10000 })
    .expect(201);

  // Get balances
  const res = await request(app)
    .get('/api/groups/1/balances')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.ok(Array.isArray(res.body.balances));
  // User 2 owed 10000, paid 10000 -> balance 0
  // User 3 owed 10000, paid 0 -> owes 10000 to User 1
  const balance = res.body.balances.find(b => b.debtorId === 3 && b.creditorId === 1);
  assert.ok(balance);
  assert.equal(balance.totalCents, 10000);
  assert.ok(balance.breakdown.length > 0);
});

test('GET /groups/:id/balances: rejects unauthenticated', async () => {
  const db = createTestDb();
  const { app } = buildApp(db);

  await request(app)
    .get('/api/groups/1/balances')
    .expect(401);
});

test('POST /groups/:id/settlements: records valid settlement', async () => {
  const db = createTestDb();
  const { app, tokenService } = buildApp(db);
  const token = createAuthToken(tokenService, 1);

  // Create expense first
  await request(app)
    .post('/api/groups/1/expenses')
    .set('Authorization', `Bearer ${token}`)
    .send({ amountCents: 30000, description: 'Cena' })
    .expect(201);

  // User 2 settles
  const token2 = createAuthToken(tokenService, 2);
  const res = await request(app)
    .post('/api/groups/1/settlements')
    .set('Authorization', `Bearer ${token2}`)
    .send({ payeeId: 1, amountCents: 10000 })
    .expect(201);

  assert.ok(res.body.id);
  assert.equal(res.body.payerId, 2);
  assert.equal(res.body.payeeId, 1);
  assert.equal(res.body.amountCents, 10000);
});

test('POST /groups/:id/settlements: rejects overpayment', async () => {
  const db = createTestDb();
  const { app, tokenService } = buildApp(db);
  const token = createAuthToken(tokenService, 1);

  // Create expense
  await request(app)
    .post('/api/groups/1/expenses')
    .set('Authorization', `Bearer ${token}`)
    .send({ amountCents: 30000, description: 'Cena' })
    .expect(201);

  // User 2 tries to overpay
  const token2 = createAuthToken(tokenService, 2);
  await request(app)
    .post('/api/groups/1/settlements')
    .set('Authorization', `Bearer ${token2}`)
    .send({ payeeId: 1, amountCents: 15000 })
    .expect(400);
});

test('POST /groups/:id/settlements: rejects unauthenticated', async () => {
  const db = createTestDb();
  const { app } = buildApp(db);

  await request(app)
    .post('/api/groups/1/settlements')
    .send({ payeeId: 1, amountCents: 10000 })
    .expect(401);
});

test('POST /groups/:id/settlements: validates payeeId and amountCents', async () => {
  const db = createTestDb();
  const { app, tokenService } = buildApp(db);
  const token = createAuthToken(tokenService, 1);

  await request(app)
    .post('/api/groups/1/settlements')
    .set('Authorization', `Bearer ${token}`)
    .send({ payeeId: 1, amountCents: 0 })
    .expect(400);
});
