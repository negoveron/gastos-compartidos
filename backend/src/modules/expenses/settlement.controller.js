'use strict';

/**
 * SettlementController - Handles HTTP request/response for settlements.
 *
 * @param {{ settlementService: ReturnType<typeof import('./settlement.service').createSettlementService> }} deps
 */
function createSettlementController({ settlementService }) {
  return {
    /**
     * POST /groups/:id/settlements
     * Records a settlement (payment) between the authenticated user (payer) and another user (payee).
     */
    async create(req, res, next) {
      try {
        const groupId = Number(req.params.id);
        const { payeeId, amountCents } = req.body || {};
        const payerId = req.user.id;
        const requesterId = req.user.id;

        const result = await settlementService.recordSettlement({
          groupId,
          payerId,
          payeeId: Number(payeeId),
          amountCents: Number(amountCents),
          requesterId,
        });

        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    },
  };
}

module.exports = { createSettlementController };
