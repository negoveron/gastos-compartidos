'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createGroupsService } = require('../src/modules/groups/groups.service');
const {
  ValidationError,
  NotAuthorizedError,
  GroupNotFoundError,
  EmailNotFoundError,
} = require('../src/shared/errors');

function createFakeGroupsRepository() {
  const groups = new Map(); // id -> { id, nombre, owner_id, deleted_at }
  const memberships = new Map(); // `${groupId}:${userId}` -> true
  const users = new Map(); // id -> { id, email }
  let nextGroupId = 1;

  return {
    create({ nombre, ownerId }) {
      const id = nextGroupId++;
      const group = { id, nombre, owner_id: ownerId, deleted_at: null };
      groups.set(id, group);
      memberships.set(`${id}:${ownerId}`, true);
      return group;
    },
    findById(id) {
      const group = groups.get(id);
      return group && !group.deleted_at ? { ...group } : null;
    },
    findByMember(userId) {
      return Array.from(groups.values())
        .filter((g) => !g.deleted_at && memberships.has(`${g.id}:${userId}`))
        .map((g) => ({ id: g.id, nombre: g.nombre, owner_id: g.owner_id }));
    },
    findUserByEmail(email) {
      for (const user of users.values()) {
        if (user.email === email) return { ...user };
      }
      return null;
    },
    addMember({ groupId, userId }) {
      if (groups.get(groupId) && !groups.get(groupId).deleted_at) {
        memberships.set(`${groupId}:${userId}`, true);
      }
    },
    removeMember({ groupId, userId }) {
      memberships.delete(`${groupId}:${userId}`);
    },
    getMembers(groupId) {
      const group = groups.get(groupId);
      if (!group || group.deleted_at) return [];
      return Array.from(memberships.entries())
        .filter(([key]) => key.startsWith(`${groupId}:`))
        .map(([key]) => {
          const [, uid] = key.split(':');
          const user = users.get(Number(uid)) || { id: Number(uid), email: `user${uid}@example.com` };
          return {
            user_id: user.id,
            email: user.email,
            nombre: user.nombre || null,
            group_id: group.id,
          };
        });
    },
    delete(id) {
      const group = groups.get(id);
      if (group) group.deleted_at = new Date().toISOString();
    },
    // Test helper to seed users
    _addUser(user) {
      users.set(user.id, user);
    },
  };
}

function buildService() {
  const groupsRepository = createFakeGroupsRepository();
  const groupsService = createGroupsService({ groupsRepository });
  return { groupsService, groupsRepository };
}

test('create: succeeds with valid nombre and sets owner as member', async () => {
  const { groupsService, groupsRepository } = buildService();

  const result = await groupsService.create({ nombre: 'Mi Grupo', ownerId: 1 });

  assert.equal(result.id, 1);
  assert.equal(result.nombre, 'Mi Grupo');
  assert.equal(result.ownerId, 1);

  // Verify owner is a member
  const memberships = Array.from(
    groupsRepository.findByMember(1)
  ).map((g) => g.id);
  assert.ok(memberships.includes(1));
});

test('create: empty nombre is rejected with VALIDATION_ERROR', async () => {
  const { groupsService } = buildService();

  await assert.rejects(
    () => groupsService.create({ nombre: '', ownerId: 1 }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.status, 400);
      assert.equal(err.code, 'VALIDATION_ERROR');
      return true;
    }
  );
});

test('create: whitespace-only nombre is rejected', async () => {
  const { groupsService } = buildService();

  await assert.rejects(
    () => groupsService.create({ nombre: '   ', ownerId: 1 }),
    (err) => {
      assert.equal(err.code, 'VALIDATION_ERROR');
      return true;
    }
  );
});

test('listMyGroups: returns all groups where user is member', async () => {
  const { groupsService, groupsRepository } = buildService();

  // Seed users
  groupsRepository._addUser({ id: 1, email: 'owner@example.com' });
  groupsRepository._addUser({ id: 2, email: 'other@example.com' });

  // Create group 1 with owner 1
  await groupsService.create({ nombre: 'Grupo A', ownerId: 1 });
  // Create group 2 with owner 1
  await groupsService.create({ nombre: 'Grupo B', ownerId: 1 });
  // Create group 3 with owner 2
  await groupsService.create({ nombre: 'Grupo C', ownerId: 2 });

  const groups = await groupsService.listMyGroups(1);

  assert.equal(groups.length, 2);
  assert.deepEqual(
    groups.map((g) => g.nombre).sort(),
    ['Grupo A', 'Grupo B']
  );
});

test('listMyGroups: isOwner es true para el creador y false para un miembro no-owner', async () => {
  const { groupsService, groupsRepository } = buildService();

  // Seed users
  groupsRepository._addUser({ id: 1, email: 'owner@example.com' });
  groupsRepository._addUser({ id: 2, email: 'member@example.com' });

  // Create group with owner 1
  const group = await groupsService.create({ nombre: 'Test', ownerId: 1 });

  // Invite user2 to the group
  await groupsService.inviteMember({ groupId: group.id, email: 'member@example.com', inviterId: 1 });

  // Verify isOwner==true for user1
  const groupsOwner = await groupsService.listMyGroups(1);
  assert.deepEqual(
    groupsOwner.map((g) => ({ id: g.id, isOwner: g.isOwner })),
    [{ id: group.id, isOwner: true }]
  );

  // Verify isOwner==false for user2
  const groupsMember = await groupsService.listMyGroups(2);
  assert.deepEqual(
    groupsMember.map((g) => ({ id: g.id, isOwner: g.isOwner })),
    [{ id: group.id, isOwner: false }]
  );
});

test('inviteMember: non-owner is rejected with NOT_AUTHORIZED', async () => {
  const { groupsService, groupsRepository } = buildService();

  // Seed user
  groupsRepository._addUser({ id: 1, email: 'owner@example.com' });
  groupsRepository._addUser({ id: 2, email: 'inviter@example.com' });

  // Create group with owner 1
  const group = await groupsService.create({ nombre: 'Test', ownerId: 1 });

  // User 2 tries to invite (not owner)
  await assert.rejects(
    () => groupsService.inviteMember({ groupId: group.id, email: 'new@example.com', inviterId: 2 }),
    (err) => {
      assert.equal(err.status, 403);
      assert.equal(err.code, 'NOT_AUTHORIZED');
      return true;
    }
  );
});

test('inviteMember: non-existent email returns EMAIL_NOT_FOUND with explicit message', async () => {
  const { groupsService, groupsRepository } = buildService();

  // Seed owner
  groupsRepository._addUser({ id: 1, email: 'owner@example.com' });

  const group = await groupsService.create({ nombre: 'Test', ownerId: 1 });

  await assert.rejects(
    () => groupsService.inviteMember({ groupId: group.id, email: 'notfound@example.com', inviterId: 1 }),
    (err) => {
      assert.equal(err.status, 404);
      assert.equal(err.code, 'EMAIL_NOT_FOUND');
      assert.ok(err.message.includes('notfound@example.com'));
      assert.ok(err.message.includes('debe tener una cuenta'));
      return true;
    }
  );
});

test('inviteMember: user is added as member', async () => {
  const { groupsService, groupsRepository } = buildService();

  // Seed users
  groupsRepository._addUser({ id: 1, email: 'owner@example.com' });
  groupsRepository._addUser({ id: 2, email: 'invite@example.com' });

  const group = await groupsService.create({ nombre: 'Test', ownerId: 1 });

  await groupsService.inviteMember({ groupId: group.id, email: 'invite@example.com', inviterId: 1 });

  const members = groupsRepository.findByMember(2);
  assert.equal(members.length, 1);
  assert.equal(members[0].id, group.id);
});

test('inviteMember: non-existent group returns GROUP_NOT_FOUND', async () => {
  const { groupsService } = buildService();

  await assert.rejects(
    () => groupsService.inviteMember({ groupId: 999, email: 'exists@example.com', inviterId: 1 }),
    (err) => {
      assert.equal(err.status, 404);
      assert.equal(err.code, 'GROUP_NOT_FOUND');
      return true;
    }
  );
});

test('getMembers: only members can access group members', async () => {
  const { groupsService, groupsRepository } = buildService();

  // Seed users
  groupsRepository._addUser({ id: 1, email: 'owner@example.com', nombre: 'Owner' });
  groupsRepository._addUser({ id: 2, email: 'member@example.com', nombre: 'Member' });

  const group = await groupsService.create({ nombre: 'Test', ownerId: 1 });

  // Non-member tries to get members
  await assert.rejects(
    () => groupsService.getMembers({ groupId: group.id, requesterId: 999 }),
    (err) => {
      assert.equal(err.status, 403);
      assert.equal(err.code, 'NOT_AUTHORIZED');
      return true;
    }
  );
});

test('getMembers: returns members with owner flag', async () => {
  const { groupsService, groupsRepository } = buildService();

  // Seed users
  groupsRepository._addUser({ id: 1, email: 'owner@example.com', nombre: 'Owner' });
  groupsRepository._addUser({ id: 2, email: 'member@example.com', nombre: 'Member' });

  const group = await groupsService.create({ nombre: 'Test', ownerId: 1 });
  await groupsService.inviteMember({ groupId: group.id, email: 'member@example.com', inviterId: 1 });

  const members = await groupsService.getMembers({ groupId: group.id, requesterId: 1 });

  assert.equal(members.length, 2);
  const owner = members.find((m) => m.email === 'owner@example.com');
  const member = members.find((m) => m.email === 'member@example.com');
  assert.equal(owner.isOwner, true);
  assert.equal(member.isOwner, false);
});

test('removeMember: non-owner cannot remove members', async () => {
  const { groupsService, groupsRepository } = buildService();

  // Seed users
  groupsRepository._addUser({ id: 1, email: 'owner@example.com' });
  groupsRepository._addUser({ id: 2, email: 'member@example.com' });

  const group = await groupsService.create({ nombre: 'Test', ownerId: 1 });
  await groupsService.inviteMember({ groupId: group.id, email: 'member@example.com', inviterId: 1 });

  await assert.rejects(
    () => groupsService.removeMember({ groupId: group.id, userId: 2, removerId: 2 }),
    (err) => {
      assert.equal(err.status, 403);
      assert.equal(err.code, 'NOT_AUTHORIZED');
      return true;
    }
  );
});

test('removeMember: owner cannot remove themselves', async () => {
  const { groupsService, groupsRepository } = buildService();

  // Seed users
  groupsRepository._addUser({ id: 1, email: 'owner@example.com' });

  const group = await groupsService.create({ nombre: 'Test', ownerId: 1 });

  await assert.rejects(
    () => groupsService.removeMember({ groupId: group.id, userId: 1, removerId: 1 }),
    (err) => {
      assert.equal(err.code, 'NOT_AUTHORIZED');
      assert.ok(err.message.includes('removerse'));
      return true;
    }
  );
});

test('removeMember: owner can remove other members', async () => {
  const { groupsService, groupsRepository } = buildService();

  // Seed users
  groupsRepository._addUser({ id: 1, email: 'owner@example.com' });
  groupsRepository._addUser({ id: 2, email: 'member@example.com' });

  const group = await groupsService.create({ nombre: 'Test', ownerId: 1 });
  await groupsService.inviteMember({ groupId: group.id, email: 'member@example.com', inviterId: 1 });

  await groupsService.removeMember({ groupId: group.id, userId: 2, removerId: 1 });

  const members = groupsRepository.findByMember(2);
  assert.equal(members.length, 0);
});