'use strict';

const express = require('express');

/**
 * Expense routes with JWT auth protection.
 *
 * @param {{
 *   expenseController: ReturnType<typeof import('./expense.controller').createExpenseController>,
 *   requireAuth: ReturnType<typeof import('../auth/auth.middleware').createRequireAuth>,
 * }} deps
 */
function createExpenseRoutes({ expenseController, requireAuth }) {
  const router = express.Router();

  // All routes require authentication
  router.use(requireAuth);

  router.post('/:id/expenses', expenseController.create);
  router.get('/:id/balances', expenseController.getBalances);

  return router;
}

module.exports = { createExpenseRoutes };
