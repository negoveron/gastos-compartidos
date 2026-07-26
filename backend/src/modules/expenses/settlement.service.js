'use strict';

const {
  ValidationError,
  NotAuthorizedError,
  GroupNotFoundError,
} = require('../../shared/errors');

/**
 * Maps database settlement row to public API format.
 */
function toPublicSettlement(row) {
  return {
    id: row.id,
    groupId: row.group_id,
    payerId: row.payer_id,
    payeeId: row.payee_id,
    amountCents: row.amount_cents,
    createdAt: row.created_at,
  };
}

/**
 * SettlementService - Business logic for settlement processing.
 *
 * @param {{
 *   settlementRepository: ReturnType<typeof import('./settlement.repository').createSettlementRepository>,
 *   expenseRepository: ReturnType<typeof import('./expense.repository').createExpenseRepository>,
 *   groupsRepository: ReturnType<typeof import('../groups/groups.repository').createGroupsRepository>,
 *   db: import('better-sqlite3').Database
 * }} deps
 */
function createSettlementService({ settlementRepository, expenseRepository, groupsRepository, db }) {
  return {
    /**
     * Records a settlement (payment) between two users in a group.
     * Validates that the amount does not exceed the current net debt (FIFO).
     * Uses BEGIN IMMEDIATE transaction to prevent race conditions.
     *
     * @param {{ groupId: number, payerId: number, payeeId: number, amountCents: number, requesterId: number }} params
     * @returns {Promise<{ id: number, groupId: number, payerId: number, payeeId: number, amountCents: number, createdAt: string }>}
     */
    async recordSettlement({ groupId, payerId, payeeId, amountCents, requesterId }) {
      // Validate group exists
      const group = groupsRepository.findById(groupId);
      if (!group) {
        throw GroupNotFoundError();
      }

      // Validate both users are members of the group
      const members = groupsRepository.getMembers(groupId);
      const memberIds = members.map((m) => m.user_id);
      const isPayerMember = memberIds.includes(payerId);
      const isPayeeMember = memberIds.includes(payeeId);
      const isRequesterMember = memberIds.includes(requesterId);

      if (!isRequesterMember) {
        throw NotAuthorizedError('El solicitante no es miembro del grupo');
      }
      if (!isPayerMember) {
        throw NotAuthorizedError('El pagador no es miembro del grupo');
      }
      if (!isPayeeMember) {
        throw NotAuthorizedError('El beneficiario no es miembro del grupo');
      }

      if (payerId === payeeId) {
        throw ValidationError([{ field: 'payeeId', message: 'No te puedes pagar a ti mismo' }]);
      }

      // Validate amount
      if (!Number.isInteger(amountCents) || amountCents <= 0) {
        throw ValidationError([{ field: 'amountCents', message: 'El monto debe ser un entero positivo en centavos' }]);
      }

      // Use BEGIN IMMEDIATE transaction to prevent race conditions
      // between net debt calculation and settlement insertion
      const transaction = db.transaction(() => {
        // Calculate current net debt: Total Owed (payer -> payee) - Total Paid (payer -> payee)
        const netDebt = this._calculateNetDebt(groupId, payerId, payeeId);

        if (amountCents > netDebt) {
          throw ValidationError([{ field: 'amountCents', message: 'Overpayment not allowed: el monto excede la deuda actual' }]);
        }

        // Create settlement record
        const settlementId = settlementRepository.createSettlement({
          groupId,
          payerId,
          payeeId,
          amountCents,
        });

        const settlement = settlementRepository.findSettlementById(settlementId);
        return toPublicSettlement(settlement);
      });

      return transaction();
    },

    /**
     * Calculates the net debt from payer to payee using FIFO approach.
     * Net Debt = Total Owed (from expense splits) - Total Paid (from settlements)
     *
     * @private
     * @param {number} groupId
     * @param {number} payerId
     * @param {number} payeeId
     * @returns {Promise<number>} Net debt in cents (non-negative)
     */
    _calculateNetDebt(groupId, payerId, payeeId) {
      // Get all expenses in the group
      const expenses = expenseRepository.findExpensesByGroup(groupId);

      // Calculate total owed: sum of splits where payer paid and payee owes
      let totalOwed = 0;
      for (const expense of expenses) {
        if (expense.payer_id === payeeId) {
          // payeeId paid this expense, check if payerId has a split
          const splits = expenseRepository.findSplitsByExpenseId(expense.id);
          const payerSplit = splits.find((s) => s.user_id === payerId);
          if (payerSplit) {
            totalOwed += payerSplit.amount_cents;
          }
        }
      }

      // Calculate total paid: sum of settlements from payer to payee
      const settlements = settlementRepository.findSettlementsBetweenUsers(groupId, payerId, payeeId);
      const totalPaid = settlements.reduce((sum, s) => sum + s.amount_cents, 0);

      // Net debt = owed - paid (never negative)
      const netDebt = totalOwed - totalPaid;
      return Math.max(0, netDebt);
    },
  };
}

module.exports = { createSettlementService, toPublicSettlement };
