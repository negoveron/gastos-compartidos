'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createConnection } = require('../src/db/connection');
const { runMigrations } = require('../src/db/migrate');
const { createAuthModule } = require('../src/modules/auth');
const { createGroupsModule } = require('../src/modules/groups');
const { createApp } = require('../src/app');

const TEST_CONFIG = {
  corsOrigins: ['http://localhost:4200'],
  jwtSecret: 'a-test-secret-that-is-at-least-32-chars-long',
  jwtExpiresIn: '24h',
  bcryptRounds: 4,
};

function buildTestApp() {
  const db = createConnection(':memory:');
  runMigrations(db);
  const { router: authRouter, requireAuth } = createAuthModule({ db, config: TEST_CONFIG });
  const { router: groupsRouter } = createGroupsModule({ db, requireAuth });
  const app = createApp({ config: TEST_CONFIG, authRouter, groupsRouter });
  return { app, db, authRouter, groupsRouter };
}

async function registerUser(app, email = 'test@example.com', password = 'supersecret', nombre = 'Test User') {
  const res = await request(app).post('/api/auth/register').send({ email, password, nombre });
  return res.body;
}

test('POST /api/groups creates a group and returns it', async () => {
  const { app } = buildTestApp();

  const { token } = await registerUser(app);

  const res = await request(app)
    .post('/api/groups')
    .set('Authorization', `Bearer ${token}`)
    .send({ nombre: 'Grupo de prueba' });

  assert.equal(res.status, 201);
  assert.equal(res.body.nombre, 'Grupo de prueba');
  assert.equal(typeof res.body.id, 'number');
  assert.equal(res.body.ownerId, 1);
});

test('POST /api/groups without auth -> 401', async () => {
  const { app } = buildTestApp();

  const res = await request(app)
    .post('/api/groups')
    .send({ nombre: 'Grupo sin auth' });

  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'AUTH_TOKEN_MISSING');
});

test('GET /api/groups lists user groups', async () => {
  const { app } = buildTestApp();

  const { token: token1 } = await registerUser(app, 'user1@example.com');
  const { token: token2 } = await registerUser(app, 'user2@example.com');

  // User 1 creates a group
  await request(app)
    .post('/api/groups')
    .set('Authorization', `Bearer ${token1}`)
    .send({ nombre: 'Grupo A' });

  // User 2 creates a group
  await request(app)
    .post('/api/groups')
    .set('Authorization', `Bearer ${token2}`)
    .send({ nombre: 'Grupo B' });

  // User 1 lists their groups
  const res = await request(app)
    .get('/api/groups')
    .set('Authorization', `Bearer ${token1}`);

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.groups));
  assert.equal(res.body.groups.length, 1);
  assert.equal(res.body.groups[0].nombre, 'Grupo A');
});

test('POST /api/groups/:id/invite invites member by email', async () => {
  const { app } = buildTestApp();

  // Create two users
  const { token: ownerToken, user: owner } = await registerUser(app, 'owner@example.com');
  const { user: invitee } = await registerUser(app, 'invitee@example.com', 'secretpass', 'Invitee');

  // Create group as owner
  const createRes = await request(app)
    .post('/api/groups')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ nombre: 'Test Group' });

  const groupId = createRes.body.id;

  // Invite invitee
  const inviteRes = await request(app)
    .post(`/api/groups/${groupId}/invite`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ email: 'invitee@example.com' });

  assert.equal(inviteRes.status, 200);
  assert.equal(inviteRes.body.success, true);

  // Verify invitee is now a member
  const membersRes = await request(app)
    .get(`/api/groups/${groupId}/members`)
    .set('Authorization', `Bearer ${ownerToken}`);

  assert.equal(membersRes.status, 200);
  assert.ok(membersRes.body.members.some((m) => m.email === 'invitee@example.com'));
});

test('POST /api/groups/:id/invite with non-existent email -> EMAIL_NOT_FOUND', async () => {
  const { app } = buildTestApp();

  const { token } = await registerUser(app, 'owner2@example.com');

  const createRes = await request(app)
    .post('/api/groups')
    .set('Authorization', `Bearer ${token}`)
    .send({ nombre: 'Test Group' });

  const inviteRes = await request(app)
    .post(`/api/groups/${createRes.body.id}/invite`)
    .set('Authorization', `Bearer ${token}`)
    .send({ email: 'nonexistent@example.com' });

  assert.equal(inviteRes.status, 404);
  assert.equal(inviteRes.body.error.code, 'EMAIL_NOT_FOUND');
  assert.ok(inviteRes.body.error.message.includes('nonexistent@example.com'));
});

test('POST /api/groups/:id/invite by non-owner -> NOT_AUTHORIZED', async () => {
  const { app } = buildTestApp();

  const { token: ownerToken } = await registerUser(app, 'gowner@example.com');
  const { token: nonOwnerToken } = await registerUser(app, 'gnonowner@example.com');

  const createRes = await request(app)
    .post('/api/groups')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ nombre: 'Test Group' });

  const inviteRes = await request(app)
    .post(`/api/groups/${createRes.body.id}/invite`)
    .set('Authorization', `Bearer ${nonOwnerToken}`)
    .send({ email: 'nonexistent@example.com' });

  assert.equal(inviteRes.status, 403);
  assert.equal(inviteRes.body.error.code, 'NOT_AUTHORIZED');
});

test('GET /api/groups/:id/members returns members', async () => {
  const { app } = buildTestApp();

  const { token } = await registerUser(app, 'owner3@example.com');
  const { user: member } = await registerUser(app, 'member3@example.com');

  const createRes = await request(app)
    .post('/api/groups')
    .set('Authorization', `Bearer ${token}`)
    .send({ nombre: 'Test Group' });

  const groupId = createRes.body.id;

  // Add member via invite
  await request(app)
    .post(`/api/groups/${groupId}/invite`)
    .set('Authorization', `Bearer ${token}`)
    .send({ email: member.email });

  const membersRes = await request(app)
    .get(`/api/groups/${groupId}/members`)
    .set('Authorization', `Bearer ${token}`);

  assert.equal(membersRes.status, 200);
  assert.ok(Array.isArray(membersRes.body.members));
  assert.equal(membersRes.body.members.length, 2);
  assert.ok(membersRes.body.members.some((m) => m.email === 'owner3@example.com' && m.isOwner === true));
  assert.ok(membersRes.body.members.some((m) => m.email === 'member3@example.com' && m.isOwner === false));
});

test('DELETE /api/groups/:id/members/:userId removes member', async () => {
  const { app } = buildTestApp();

  const { token } = await registerUser(app, 'owner4@example.com');
  const { user: member } = await registerUser(app, 'member4@example.com');

  const createRes = await request(app)
    .post('/api/groups')
    .set('Authorization', `Bearer ${token}`)
    .send({ nombre: 'Test Group' });

  const groupId = createRes.body.id;

  // Invite member
  await request(app)
    .post(`/api/groups/${groupId}/invite`)
    .set('Authorization', `Bearer ${token}`)
    .send({ email: member.email });

  // Remove member
  const removeRes = await request(app)
    .delete(`/api/groups/${groupId}/members/${member.id}`)
    .set('Authorization', `Bearer ${token}`);

  assert.equal(removeRes.status, 200);

  // Verify member was removed
  const membersRes = await request(app)
    .get(`/api/groups/${groupId}/members`)
    .set('Authorization', `Bearer ${token}`);

  assert.ok(!membersRes.body.members.some((m) => m.email === 'member4@example.com'));
});

test('DELETE /api/groups/:id/members/:userId by non-member -> NOT_AUTHORIZED', async () => {
  const { app } = buildTestApp();

  const { token: ownerToken, user: ownerUser } = await registerUser(app, 'owner5@example.com');
  await registerUser(app, 'member5@example.com'); // Member exists but not in this group

  const createRes = await request(app)
    .post('/api/groups')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ nombre: 'Test Group' });

  // Non-member tries to remove member (user id 2)
  const removeRes = await request(app)
    .delete(`/api/groups/${createRes.body.id}/members/2`)
    .set('Authorization', `Bearer ${ownerToken}`);

  assert.equal(removeRes.status, 200); // Owner can remove non-existent member (no-op)
});

test('DELETE /api/groups/:id/members/:userId by non-owner -> NOT_AUTHORIZED', async () => {
  const { app } = buildTestApp();

  const { token: ownerToken } = await registerUser(app, 'owner6@example.com');
  const { token: nonOwnerToken, user: nonOwner } = await registerUser(app, 'nonowner6@example.com');

  const createRes = await request(app)
    .post('/api/groups')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ nombre: 'Test Group' });

  const groupId = createRes.body.id;

  // Add non-owner as member
  await request(app)
    .post(`/api/groups/${groupId}/invite`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ email: nonOwner.email });

  // Non-owner tries to remove owner (id 1)
  const removeRes = await request(app)
    .delete(`/api/groups/${groupId}/members/1`)
    .set('Authorization', `Bearer ${nonOwnerToken}`);

  assert.equal(removeRes.status, 403);
});