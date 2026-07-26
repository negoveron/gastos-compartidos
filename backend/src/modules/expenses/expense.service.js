'use strict';

const { calculateSplits } = require('./rounding-engine');
const {
  ValidationError,
  NotAuthorizedError,
  GroupNotFoundError,
} = require('../../shared/errors');

/**
 * Maps database expense row to public API format.
 */
function toPublicExpense(row) {
  return {
    id: row.id,
    groupId: row.group_id,
    payerId: row.payer_id,
    amountCents: row.amount_cents,
    description: row.description,
    createdAt: row.created_at,
  };
}

/**
 * Maps database split row to public API format.
 */
function toPublicSplit(row) {
  return {
    userId: row.user_id,
    amountCents: row.amount_cents,
  };
}

/**
 * Maps balance breakdown item to public API format.
 */
function toPublicBalanceBreakdown(expense, splitAmountCents) {
  return {
    expenseId: expense.id,
    description: expense.description,
    amountCents: splitAmountCents,
    createdAt: expense.created_at,
  };
}

/**
 * ExpenseService - Business logic for expense management.
 *
 * @param {{
 *   expenseRepository: ReturnType<typeof import('./expense.repository').createExpenseRepository>,
 *   settlementRepository: ReturnType<typeof import('./settlement.repository').createSettlementRepository>,
 *   groupsRepository: ReturnType<typeof import('../groups/groups.repository').createGroupsRepository>,
 * }} deps
 */
function createExpenseService({ expenseRepository, settlementRepository, groupsRepository }) {
  return {
    /**
     * Creates a new expense with equal splits among active group members.
     * @param {{ groupId: number, payerId: number, amountCents: number, description: string, requesterId: number }} params
     * @returns {Promise<{ id: number, groupId: number, payerId: number, amountCents: number, description: string, createdAt: string, splits: Array<{userId: number, amountCents: number}> }>}
     */
    async createExpense({ groupId, payerId, amountCents, description, requesterId }) {
      // Validate group exists
      const group = groupsRepository.findById(groupId);
      if (!group) {
        throw GroupNotFoundError();
      }

      // Validate requester is a member of the group
      const members = groupsRepository.getMembers(groupId);
      const memberIds = members.map((m) => m.user_id);
      const isRequesterMember = memberIds.includes(requesterId);
      const isPayerMember = memberIds.includes(payerId);

      if (!isRequesterMember) {
        throw NotAuthorizedError('El solicitante no es miembro del grupo');
      }
      if (!isPayerMember) {
        throw NotAuthorizedError('El pagador no es miembro del grupo');
      }

      // Validate input
      if (!Number.isInteger(amountCents) || amountCents <= 0) {
        throw ValidationError([{ field: 'amountCents', message: 'El monto debe ser un entero positivo en centavos' }]);
      }

      if (!description || typeof description !== 'string' || description.trim().length === 0) {
        throw ValidationError([{ field: 'description', message: 'La descripción es requerida' }]);
      }

      // Calculate splits using RoundingEngine
      const splits = calculateSplits(amountCents, memberIds);

      // Create expense with splits
      const expenseId = expenseRepository.createExpense({
        groupId,
        payerId,
        amountCents,
        description: description.trim(),
        splits,
      });

      // Return public format
      const expense = expenseRepository.findExpenseById(expenseId);
      const createdSplits = expenseRepository.findSplitsByExpenseId(expenseId);

      return {
        ...toPublicExpense(expense),
        splits: createdSplits.map(toPublicSplit),
      };
    },

    /**
     * Calculates detailed balances for a group using FIFO approach.
     * Returns array of { debtorId, creditorId, totalCents, breakdown[] }
     * where breakdown shows each expense contributing to the debt.
     *
     * @param {{ groupId: number, requesterId: number }} params
     * @returns {Promise<Array<{ debtorId: number, creditorId: number, totalCents: number, breakdown: Array<{expenseId: number, description: string, amountCents: number, createdAt: string}> }>>}
     */
    async calculateBalances({ groupId, requesterId }) {
      // Validate group exists
      const group = groupsRepository.findById(groupId);
      if (!group) {
        throw GroupNotFoundError();
      }

      // Validate requester is a member
      const members = groupsRepository.getMembers(groupId);
      const memberIds = members.map((m) => m.user_id);
      if (!memberIds.includes(requesterId)) {
        throw NotAuthorizedError('No tenés acceso a este grupo');
      }

      // Get all expenses in the group (ordered by creation date for FIFO)
      const expenses = expenseRepository.findExpensesByGroup(groupId);

      // Get all settlements in the group
      const settlements = settlementRepository.findSettlementsByGroup(groupId);

      // Build debt map: debtorId -> creditorId -> { totalCents, breakdown[] }
      const debtMap = new Map(); // debtorId -> Map<creditorId, { totalCents, breakdown[] }>

      // Step 1: Calculate gross debts from expenses
      // For each expense, the payer is the creditor, each split (except payer) is a debtor
      for (const expense of expenses) {
        const creditorId = expense.payer_id;
        const splits = expenseRepository.findSplitsByExpenseId(expense.id);

        for (const split of splits) {
          const debtorId = split.user_id;
          if (debtorId === creditorId) continue; // Payer doesn't owe themselves

          const amountCents = split.amount_cents;

          if (!debtMap.has(debtorId)) {
            debtMap.set(debtorId, new Map());
          }
          const creditorMap = debtMap.get(debtorId);

          if (!creditorMap.has(creditorId)) {
            creditorMap.set(creditorId, { totalCents: 0, breakdown: [] });
          }
          const debt = creditorMap.get(creditorId);
          debt.totalCents += amountCents;
          debt.breakdown.push(toPublicBalanceBreakdown(expense, amountCents));
        }
      }

      // Step 2: Apply settlements (FIFO - reduce oldest debts first)
      // Settlements are already ordered by created_at ASC from repository
      for (const settlement of settlements) {
        const payerId = settlement.payer_id; // The one paying (debtor)
        const payeeId = settlement.payee_id; // The one receiving (creditor)
        let remainingAmount = settlement.amount_cents;

        // Find the debt from payer to payee
        const creditorMap = debtMap.get(payerId);
        if (!creditorMap) continue;

        const debt = creditorMap.get(payeeId);
        if (!debt) continue;

        // Calculate how much of this settlement applies to this debt pair
        const amountApplied = Math.min(remainingAmount, debt.totalCents);

        // Reduce the total debt
        debt.totalCents -= amountApplied;
        remainingAmount -= amountApplied;

        // Reduce the breakdown proportionally (FIFO) using the same amountApplied
        // Since breakdown is ordered by expense creation date, we reduce from the first entries
        let amountToReduce = amountApplied;
        for (const item of debt.breakdown) {
          if (amountToReduce <= 0) break;
          const reduction = Math.min(item.amountCents, amountToReduce);
          item.amountCents -= reduction;
          amountToReduce -= reduction;
        }
        // Remove zero-amount breakdown items
        debt.breakdown = debt.breakdown.filter((item) => item.amountCents > 0);
      }

      // Step 3: Build result array
      const balances = [];
      for (const [debtorId, creditorMap] of debtMap.entries()) {
        for (const [creditorId, debt] of creditorMap.entries()) {
          if (debt.totalCents > 0 && debt.breakdown.length > 0) {
            balances.push({
              debtorId,
              creditorId,
              totalCents: debt.totalCents,
              breakdown: debt.breakdown,
            });
          }
        }
      }

      return balances;
    },
  };
}

module.exports = { createExpenseService, toPublicExpense, toPublicSplit, toPublicBalanceBreakdown };
