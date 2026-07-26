'use strict';

const express = require('express');

/**
 * Settlement routes with JWT auth protection.
 *
 * @param {{
 *   settlementController: ReturnType<typeof import('./settlement.controller').createSettlementController>,
 *   requireAuth: ReturnType<typeof import('../auth/auth.middleware').createRequireAuth>,
 * }} deps
 */
function createSettlementRoutes({ settlementController, requireAuth }) {
  const router = express.Router();

  // All routes require authentication
  router.use(requireAuth);

  router.post('/:id/settlements', settlementController.create);

  return router;
}

module.exports = { createSettlementRoutes };
