'use strict';

const { createExpenseRepository } = require('./expense.repository');
const { createSettlementRepository } = require('./settlement.repository');
const { createExpenseService } = require('./expense.service');
const { createSettlementService } = require('./settlement.service');
const { createExpenseController } = require('./expense.controller');
const { createSettlementController } = require('./settlement.controller');
const { createExpenseRoutes } = require('./expenses.routes');
const { createSettlementRoutes } = require('./settlements.routes');

/**
 * Composition root for the expenses module.
 * Wires repository → service → controller → router.
 *
 * @param {{
 *   db: import('better-sqlite3').Database,
 *   requireAuth: ReturnType<typeof import('../auth/auth.middleware').createRequireAuth>,
 * }} deps
 */
function createExpensesModule({ db, requireAuth }) {
  const expenseRepository = createExpenseRepository(db);
  const settlementRepository = createSettlementRepository(db);
  const groupsRepository = require('../groups/groups.repository').createGroupsRepository(db);

  const expenseService = createExpenseService({ expenseRepository, settlementRepository, groupsRepository });
  const settlementService = createSettlementService({ settlementRepository, expenseRepository, groupsRepository, db });

  const expenseController = createExpenseController({ expenseService });
  const settlementController = createSettlementController({ settlementService });

  const expenseRouter = createExpenseRoutes({ expenseController, requireAuth });
  const settlementRouter = createSettlementRoutes({ settlementController, requireAuth });

  // Combine routers
  const express = require('express');
  const router = express.Router();
  router.use('/groups', expenseRouter);
  router.use('/groups', settlementRouter);

  return { router, expenseService, settlementService };
}

module.exports = { createExpensesModule };
