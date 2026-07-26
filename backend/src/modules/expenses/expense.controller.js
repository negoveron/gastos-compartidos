'use strict';

/**
 * ExpenseController - Handles HTTP request/response for expenses.
 *
 * @param {{ expenseService: ReturnType<typeof import('./expense.service').createExpenseService> }} deps
 */
function createExpenseController({ expenseService }) {
  return {
    /**
     * POST /groups/:id/expenses
     * Creates a new expense with equal splits among group members.
     */
    async create(req, res, next) {
      try {
        const groupId = Number(req.params.id);
        const { amountCents, description } = req.body || {};
        const requesterId = req.user.id;

        // Payer is the authenticated user by default
        const payerId = requesterId;

        const result = await expenseService.createExpense({
          groupId,
          payerId,
          amountCents,
          description,
          requesterId,
        });

        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    },

    /**
     * GET /groups/:id/balances
     * Returns detailed balance breakdown for the group.
     */
    async getBalances(req, res, next) {
      try {
        const groupId = Number(req.params.id);
        const requesterId = req.user.id;

        // The balance calculation is done in the service layer
        // We'll use the expenseService to get expenses and calculate
        // For now, we'll import the balance calculation logic here
        // Actually, let's create a separate balance service or add to expenseService
        const balances = await expenseService.calculateBalances({ groupId, requesterId });

        res.status(200).json({ balances });
      } catch (err) {
        next(err);
      }
    },
  };
}

module.exports = { createExpenseController };
