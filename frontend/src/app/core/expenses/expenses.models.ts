/**
 * Core Expense Models
 *
 * These models mirror the backend API contracts exactly.
 * Money amounts are handled in cents (integers) to avoid floating-point issues.
 * Conversion to display format (decimal strings) happens in the presentation layer.
 */

export interface ExpenseSplit {
  userId: number;
  amountCents: number;
}

export interface Expense {
  id: number;
  groupId: number;
  payerId: number;
  amountCents: number;
  description: string;
  createdAt: string; // ISO 8601 timestamp
  splits: ExpenseSplit[];
}

export interface BalanceBreakdownItem {
  expenseId: number;
  description: string;
  amountCents: number;
  createdAt: string; // ISO 8601 timestamp
}

export interface BalanceDetail {
  debtorId: number;
  creditorId: number;
  totalCents: number;
  breakdown: BalanceBreakdownItem[];
}

export interface CreateExpensePayload {
  amountCents: number;
  description: string;
}

export interface SettleRequest {
  payeeId: number;
  amountCents: number;
}

export interface SettlementResponse {
  id: number;
  groupId: number;
  payerId: number;
  payeeId: number;
  amountCents: number;
  createdAt: string; // ISO 8601 timestamp
}

export interface BalancesResponse {
  balances: BalanceDetail[];
}

export interface CreateExpenseResponse extends Expense {}

export interface ExpensesResponse {
  expenses: Expense[];
}

/**
 * Utility type for converting cents to display string (e.g., "12.34")
 * Used in presentation components, not in core models.
 */
export type DisplayAmount = string;

/**
 * Converts cents (integer) to a display string with 2 decimal places.
 * Example: 1234 -> "12.34"
 */
export function centsToDisplay(cents: number): DisplayAmount {
  return (cents / 100).toFixed(2);
}

/**
 * Converts a display string to cents (integer).
 * Example: "12.34" -> 1234
 * Throws if the input is not a valid decimal with up to 2 places.
 */
export function displayToCents(display: string): number {
  const match = display.match(/^\d+(\.\d{1,2})?$/);
  if (!match) {
    throw new Error(`Invalid amount format: ${display}`);
  }
  return Math.round(parseFloat(display) * 100);
}