'use strict';

/**
 * ExpenseRepository - Data access layer for expenses and expense_splits.
 *
 * @param {import('better-sqlite3').Database} db
 */
function createExpenseRepository(db) {
  const createExpenseStmt = db.prepare(
    'INSERT INTO expenses (group_id, payer_id, amount_cents, description) VALUES (?, ?, ?, ?)'
  );
  const createSplitStmt = db.prepare(
    'INSERT INTO expense_splits (expense_id, user_id, amount_cents) VALUES (?, ?, ?)'
  );
  const findExpenseByIdStmt = db.prepare(
    'SELECT id, group_id, payer_id, amount_cents, description, created_at FROM expenses WHERE id = ?'
  );
  const findExpensesByGroupStmt = db.prepare(
    'SELECT id, group_id, payer_id, amount_cents, description, created_at FROM expenses WHERE group_id = ? ORDER BY created_at ASC'
  );
  const findSplitsByExpenseIdStmt = db.prepare(
    'SELECT id, expense_id, user_id, amount_cents FROM expense_splits WHERE expense_id = ?'
  );
  const findSplitsByUserInGroupStmt = db.prepare(`
    SELECT es.id, es.expense_id, es.user_id, es.amount_cents
    FROM expense_splits es
    JOIN expenses e ON es.expense_id = e.id
    WHERE e.group_id = ? AND es.user_id = ?
  `);

  return {
    /**
     * Creates an expense with its splits in a single transaction.
     * @param {{ groupId: number, payerId: number, amountCents: number, description: string, splits: Array<{userId: number, amountCents: number}> }} params
     * @returns {number} The created expense ID
     */
    createExpense({ groupId, payerId, amountCents, description, splits }) {
      const transaction = db.transaction(() => {
        const info = createExpenseStmt.run(groupId, payerId, amountCents, description);
        const expenseId = info.lastInsertRowid;

        for (const split of splits) {
          createSplitStmt.run(expenseId, split.userId, split.amountCents);
        }

        return expenseId;
      });

      return transaction();
    },

    /**
     * Finds an expense by ID.
     * @param {number} id
     * @returns {Object|null}
     */
    findExpenseById(id) {
      return findExpenseByIdStmt.get(id) || null;
    },

    /**
     * Finds all expenses for a group, ordered by creation date.
     * @param {number} groupId
     * @returns {Array<Object>}
     */
    findExpensesByGroup(groupId) {
      return findExpensesByGroupStmt.all(groupId);
    },

    /**
     * Finds all splits for an expense.
     * @param {number} expenseId
     * @returns {Array<Object>}
     */
    findSplitsByExpenseId(expenseId) {
      return findSplitsByExpenseIdStmt.all(expenseId);
    },

    /**
     * Finds all splits for a user within a specific group.
     * @param {number} userId
     * @param {number} groupId
     * @returns {Array<Object>}
     */
    findSplitsByUserInGroup(userId, groupId) {
      return findSplitsByUserInGroupStmt.all(groupId, userId);
    },
  };
}

module.exports = { createExpenseRepository };
