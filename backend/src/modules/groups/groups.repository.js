'use strict';

/**
 * Repository for groups and group_members tables.
 * Wraps all SQL queries needed for group management.
 *
 * @param {import('better-sqlite3').Database} db
 */
function createGroupsRepository(db) {
  const createGroupStmt = db.prepare(
    'INSERT INTO groups (nombre, owner_id) VALUES (?, ?)'
  );
  const findGroupByIdStmt = db.prepare(
    'SELECT id, nombre, owner_id FROM groups WHERE id = ? AND deleted_at IS NULL'
  );
  const findGroupsByMemberStmt = db.prepare(`
    SELECT g.id, g.nombre, g.owner_id
    FROM groups g
    JOIN group_members gm ON g.id = gm.group_id
    WHERE gm.user_id = ? AND g.deleted_at IS NULL
  `);
  const findUserByEmailStmt = db.prepare(
    'SELECT id, email FROM users WHERE email = ? COLLATE NOCASE'
  );
  const addMemberStmt = db.prepare(
    'INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)'
  );
  const removeMemberStmt = db.prepare(
    'DELETE FROM group_members WHERE group_id = ? AND user_id = ?'
  );
  const getMembersStmt = db.prepare(`
    SELECT u.id as user_id, u.email, u.nombre,
           gm.group_id, gm.joined_at
    FROM group_members gm
    JOIN users u ON gm.user_id = u.id
    WHERE gm.group_id = ?
  `);
  const softDeleteGroupStmt = db.prepare(
    "UPDATE groups SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL"
  );

  return {
    /**
     * Creates a new group and adds the owner as the first member.
     * Returns the created group.
     */
    create({ nombre, ownerId }) {
      const info = createGroupStmt.run(nombre, ownerId);
      const groupId = info.lastInsertRowid;
      addMemberStmt.run(groupId, ownerId);
      return { id: groupId, nombre, owner_id: ownerId };
    },

    /**
     * Finds a group by ID (only non-deleted groups).
     */
    findById(id) {
      return findGroupByIdStmt.get(id) || null;
    },

    /**
     * Finds all groups where the user is a member.
     */
    findByMember(userId) {
      return findGroupsByMemberStmt.all(userId);
    },

    /**
     * Finds a user by email (case-insensitive).
     */
    findUserByEmail(email) {
      return findUserByEmailStmt.get(email) || null;
    },

    /**
     * Adds a user as a member of a group.
     * Uses INSERT OR IGNORE to handle duplicates gracefully.
     */
    addMember({ groupId, userId }) {
      addMemberStmt.run(groupId, userId);
    },

    /**
     * Removes a member from a group.
     */
    removeMember({ groupId, userId }) {
      removeMemberStmt.run(groupId, userId);
    },

    /**
     * Gets all members of a group.
     */
    getMembers(groupId) {
      return getMembersStmt.all(groupId);
    },

    /**
     * Soft deletes a group.
     */
    delete(id) {
      softDeleteGroupStmt.run(id);
    },
  };
}

module.exports = { createGroupsRepository };