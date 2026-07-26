'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateSplits } = require('../src/modules/expenses/rounding-engine');

test('calculateSplits: clean split divides evenly', () => {
  const result = calculateSplits(30000, [1, 2, 3]); // $300.00, 3 members

  assert.equal(result.length, 3);
  assert.equal(result[0].userId, 1);
  assert.equal(result[0].amountCents, 10000);
  assert.equal(result[1].userId, 2);
  assert.equal(result[1].amountCents, 10000);
  assert.equal(result[2].userId, 3);
  assert.equal(result[2].amountCents, 10000);

  const total = result.reduce((sum, s) => sum + s.amountCents, 0);
  assert.equal(total, 30000);
});

test('calculateSplits: imperfect split distributes remainder to lowest user_ids', () => {
  const result = calculateSplits(10000, [1, 2, 3]); // $100.00, 3 members

  assert.equal(result.length, 3);
  // 10000 / 3 = 3333 remainder 1
  // Member 1 (lowest ID) gets +1 cent
  assert.equal(result[0].userId, 1);
  assert.equal(result[0].amountCents, 3334);
  assert.equal(result[1].userId, 2);
  assert.equal(result[1].amountCents, 3333);
  assert.equal(result[2].userId, 3);
  assert.equal(result[2].amountCents, 3333);

  const total = result.reduce((sum, s) => sum + s.amountCents, 0);
  assert.equal(total, 10000);
});

test('calculateSplits: remainder distributed to multiple members when remainder > 1', () => {
  const result = calculateSplits(10000, [1, 2, 3, 4]); // $100.00, 4 members

  assert.equal(result.length, 4);
  // 10000 / 4 = 2500 remainder 0 - clean split
  assert.equal(result[0].amountCents, 2500);
  assert.equal(result[1].amountCents, 2500);
  assert.equal(result[2].amountCents, 2500);
  assert.equal(result[3].amountCents, 2500);

  const total = result.reduce((sum, s) => sum + s.amountCents, 0);
  assert.equal(total, 10000);
});

test('calculateSplits: remainder distributed to multiple members when remainder > 1 (imperfect)', () => {
  const result = calculateSplits(10001, [1, 2, 3, 4]); // $100.01, 4 members

  assert.equal(result.length, 4);
  // 10001 / 4 = 2500 remainder 1
  // Member 1 gets +1
  assert.equal(result[0].amountCents, 2501);
  assert.equal(result[1].amountCents, 2500);
  assert.equal(result[2].amountCents, 2500);
  assert.equal(result[3].amountCents, 2500);

  const total = result.reduce((sum, s) => sum + s.amountCents, 0);
  assert.equal(total, 10001);
});

test('calculateSplits: larger remainder distributes to first N members', () => {
  const result = calculateSplits(10003, [1, 2, 3, 4]); // $100.03, 4 members

  assert.equal(result.length, 4);
  // 10003 / 4 = 2500 remainder 3
  // Members 1, 2, 3 get +1
  assert.equal(result[0].amountCents, 2501);
  assert.equal(result[1].amountCents, 2501);
  assert.equal(result[2].amountCents, 2501);
  assert.equal(result[3].amountCents, 2500);

  const total = result.reduce((sum, s) => sum + s.amountCents, 0);
  assert.equal(total, 10003);
});

test('calculateSplits: members sorted by user_id ascending before distribution', () => {
  const result = calculateSplits(10000, [5, 2, 8, 1]); // unsorted input

  assert.equal(result.length, 4);
  // Should be sorted: [1, 2, 5, 8]
  // 10000 / 4 = 2500 remainder 0 - clean split
  assert.equal(result[0].userId, 1);
  assert.equal(result[1].userId, 2);
  assert.equal(result[2].userId, 5);
  assert.equal(result[3].userId, 8);
  assert.equal(result[0].amountCents, 2500);
  assert.equal(result[1].amountCents, 2500);
  assert.equal(result[2].amountCents, 2500);
  assert.equal(result[3].amountCents, 2500);
});

test('calculateSplits: unsorted input with remainder goes to lowest user_ids', () => {
  const result = calculateSplits(10001, [5, 2, 8, 1]); // unsorted, $100.01

  assert.equal(result.length, 4);
  // Sorted: [1, 2, 5, 8]
  // 10001 / 4 = 2500 remainder 1
  // Member 1 (lowest) gets +1
  assert.equal(result[0].userId, 1);
  assert.equal(result[0].amountCents, 2501);
  assert.equal(result[1].userId, 2);
  assert.equal(result[1].amountCents, 2500);
  assert.equal(result[2].userId, 5);
  assert.equal(result[2].amountCents, 2500);
  assert.equal(result[3].userId, 8);
  assert.equal(result[3].amountCents, 2500);

  const total = result.reduce((sum, s) => sum + s.amountCents, 0);
  assert.equal(total, 10001);
});

test('calculateSplits: single member gets full amount', () => {
  const result = calculateSplits(5000, [42]);

  assert.equal(result.length, 1);
  assert.equal(result[0].userId, 42);
  assert.equal(result[0].amountCents, 5000);
});

test('calculateSplits: two members with remainder', () => {
  const result = calculateSplits(101, [10, 20]); // $1.01, 2 members

  assert.equal(result.length, 2);
  // 101 / 2 = 50 remainder 1
  // Member 10 (lower) gets +1
  assert.equal(result[0].userId, 10);
  assert.equal(result[0].amountCents, 51);
  assert.equal(result[1].userId, 20);
  assert.equal(result[1].amountCents, 50);

  const total = result.reduce((sum, s) => sum + s.amountCents, 0);
  assert.equal(total, 101);
});

test('calculateSplits: throws on zero members', () => {
  assert.throws(
    () => calculateSplits(10000, []),
    (err) => err.message.includes('At least one member')
  );
});

test('calculateSplits: throws on negative amount', () => {
  assert.throws(
    () => calculateSplits(-100, [1, 2]),
    (err) => err.message.includes('non-negative')
  );
});
