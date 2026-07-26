'use strict';

/**
 * SettlementRepository - Data access layer for settlements.
 *
 * @param {import('better-sqlite3').Database} db
 */
function createSettlementRepository(db) {
  const createSettlementStmt = db.prepare(
    'INSERT INTO settlements (group_id, payer_id, payee_id, amount_cents) VALUES (?, ?, ?, ?)'
  );
  const findSettlementByIdStmt = db.prepare(
    'SELECT id, group_id, payer_id, payee_id, amount_cents, created_at FROM settlements WHERE id = ?'
  );
  const findSettlementsByGroupStmt = db.prepare(
    'SELECT id, group_id, payer_id, payee_id, amount_cents, created_at FROM settlements WHERE group_id = ? ORDER BY created_at ASC'
  );
  const findSettlementsBetweenUsersStmt = db.prepare(`
    SELECT id, group_id, payer_id, payee_id, amount_cents, created_at
    FROM settlements
    WHERE group_id = ? AND payer_id = ? AND payee_id = ?
    ORDER BY created_at ASC
  `);

  return {
    /**
     * Creates a settlement record.
     * @param {{ groupId: number, payerId: number, payeeId: number, amountCents: number }} params
     * @returns {number} The created settlement ID
     */
    createSettlement({ groupId, payerId, payeeId, amountCents }) {
      const info = createSettlementStmt.run(groupId, payerId, payeeId, amountCents);
      return info.lastInsertRowid;
    },

    /**
     * Finds a settlement by ID.
     * @param {number} id
     * @returns {Object|null}
     */
    findSettlementById(id) {
      return findSettlementByIdStmt.get(id) || null;
    },

    /**
     * Finds all settlements for a group, ordered by creation date.
     * @param {number} groupId
     * @returns {Array<Object>}
     */
    findSettlementsByGroup(groupId) {
      return findSettlementsByGroupStmt.all(groupId);
    },

    /**
     * Finds all settlements between two specific users in a group (directional).
     * @param {number} groupId
     * @param {number} payerId
     * @param {number} payeeId
     * @returns {Array<Object>}
     */
    findSettlementsBetweenUsers(groupId, payerId, payeeId) {
      return findSettlementsBetweenUsersStmt.all(groupId, payerId, payeeId);
    },
  };
}

module.exports = { createSettlementRepository };
