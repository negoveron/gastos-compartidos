'use strict';

/**
 * RoundingEngine - Pure utility for equal split with precision rounding.
 *
 * Distributes a total amount (in cents) across N members using integer arithmetic:
 * - base = total_cents // N
 * - remainder = total_cents % N
 * - First `remainder` members (sorted by user_id ascending) get base + 1 cent
 * - Remaining members get base cents
 * - Sum of all splits exactly equals total_cents
 */

/**
 * Calculates equal splits for a total amount across members.
 *
 * @param {number} totalCents - Total amount in cents (non-negative integer)
 * @param {number[]} memberIds - Array of user IDs (will be sorted ascending)
 * @returns {Array<{userId: number, amountCents: number}>} Sorted splits
 * @throws {Error} If memberIds is empty or totalCents is negative
 */
function calculateSplits(totalCents, memberIds) {
  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    throw new Error('At least one member is required for split calculation');
  }

  if (typeof totalCents !== 'number' || totalCents < 0 || !Number.isInteger(totalCents)) {
    throw new Error('Total amount must be a non-negative integer (cents)');
  }

  // Sort member IDs ascending for deterministic remainder distribution
  const sortedIds = [...memberIds].sort((a, b) => a - b);
  const memberCount = sortedIds.length;

  const base = Math.floor(totalCents / memberCount);
  const remainder = totalCents % memberCount;

  return sortedIds.map((userId, index) => ({
    userId,
    amountCents: base + (index < remainder ? 1 : 0),
  }));
}

module.exports = { calculateSplits };
