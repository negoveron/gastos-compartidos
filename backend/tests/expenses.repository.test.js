'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createExpenseRepository } = require('../src/modules/expenses/expense.repository');
const { createSettlementRepository } = require('../src/modules/expenses/settlement.repository');
const { createConnection } = require('../src/db/connection');
const { runMigrations } = require('../src/db/migrate');

function createTestDb() {
  const db = createConnection(':memory:');
  runMigrations(db);
  // Seed users and groups for FK constraints
  const insertUser = db.prepare('INSERT INTO users (id, email, password_hash, nombre) VALUES (?, ?, ?, ?)');
  insertUser.run(1, 'user1@test.com', 'hash', 'User 1');
  insertUser.run(2, 'user2@test.com', 'hash', 'User 2');
  insertUser.run(3, 'user3@test.com', 'hash', 'User 3');
  insertUser.run(4, 'user4@test.com', 'hash', 'User 4');
  insertUser.run(5, 'user5@test.com', 'hash', 'User 5');
  const insertGroup = db.prepare('INSERT INTO groups (id, nombre, owner_id) VALUES (?, ?, ?)');
  insertGroup.run(1, 'Group 1', 1);
  insertGroup.run(2, 'Group 2', 3);
  const insertMember = db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)');
  insertMember.run(1, 1);
  insertMember.run(1, 2);
  insertMember.run(1, 3);
  insertMember.run(2, 3);
  insertMember.run(2, 4);
  return db;
}

test('ExpenseRepository: createExpense inserts expense and splits', async () => {
  const db = createTestDb();
  const repo = createExpenseRepository(db);

  const expenseId = repo.createExpense({
    groupId: 1,
    payerId: 1,
    amountCents: 30000,
    description: 'Cena',
    splits: [
      { userId: 1, amountCents: 10000 },
      { userId: 2, amountCents: 10000 },
      { userId: 3, amountCents: 10000 },
    ],
  });

  assert.equal(typeof expenseId, 'number');
  assert.ok(expenseId > 0);

  // Verify expense was created
  const expense = repo.findExpenseById(expenseId);
  assert.ok(expense);
  assert.equal(expense.id, expenseId);
  assert.equal(expense.group_id, 1);
  assert.equal(expense.payer_id, 1);
  assert.equal(expense.amount_cents, 30000);
  assert.equal(expense.description, 'Cena');

  // Verify splits were created
  const splits = repo.findSplitsByExpenseId(expenseId);
  assert.equal(splits.length, 3);
  const totalSplits = splits.reduce((sum, s) => sum + s.amount_cents, 0);
  assert.equal(totalSplits, 30000);
});

test('ExpenseRepository: findExpenseById returns null for non-existent', () => {
  const db = createTestDb();
  const repo = createExpenseRepository(db);

  const expense = repo.findExpenseById(999);
  assert.equal(expense, null);
});

test('ExpenseRepository: findExpensesByGroup returns all expenses for group', () => {
  const db = createTestDb();
  const repo = createExpenseRepository(db);

  repo.createExpense({
    groupId: 1,
    payerId: 1,
    amountCents: 10000,
    description: 'Expense 1',
    splits: [{ userId: 1, amountCents: 5000 }, { userId: 2, amountCents: 5000 }],
  });
  repo.createExpense({
    groupId: 1,
    payerId: 2,
    amountCents: 20000,
    description: 'Expense 2',
    splits: [{ userId: 1, amountCents: 10000 }, { userId: 2, amountCents: 10000 }],
  });
  repo.createExpense({
    groupId: 2,
    payerId: 3,
    amountCents: 5000,
    description: 'Expense 3',
    splits: [{ userId: 3, amountCents: 5000 }],
  });

  const expenses = repo.findExpensesByGroup(1);
  assert.equal(expenses.length, 2);
  assert.ok(expenses.every((e) => e.group_id === 1));
});

test('ExpenseRepository: findSplitsByExpenseId returns splits for expense', () => {
  const db = createTestDb();
  const repo = createExpenseRepository(db);

  const expenseId = repo.createExpense({
    groupId: 1,
    payerId: 1,
    amountCents: 30000,
    description: 'Test',
    splits: [
      { userId: 1, amountCents: 10000 },
      { userId: 2, amountCents: 10000 },
      { userId: 3, amountCents: 10000 },
    ],
  });

  const splits = repo.findSplitsByExpenseId(expenseId);
  assert.equal(splits.length, 3);
  assert.ok(splits.every((s) => s.expense_id === expenseId));
});

test('ExpenseRepository: findSplitsByUserInGroup returns user splits in group', () => {
  const db = createTestDb();
  const repo = createExpenseRepository(db);

  // Expense 1: user 1 pays, split between 1, 2
  repo.createExpense({
    groupId: 1,
    payerId: 1,
    amountCents: 10000,
    description: 'E1',
    splits: [{ userId: 1, amountCents: 5000 }, { userId: 2, amountCents: 5000 }],
  });
  // Expense 2: user 2 pays, split between 1, 2
  repo.createExpense({
    groupId: 1,
    payerId: 2,
    amountCents: 20000,
    description: 'E2',
    splits: [{ userId: 1, amountCents: 10000 }, { userId: 2, amountCents: 10000 }],
  });
  // Expense 3: different group
  repo.createExpense({
    groupId: 2,
    payerId: 1,
    amountCents: 5000,
    description: 'E3',
    splits: [{ userId: 1, amountCents: 5000 }],
  });

  const splits = repo.findSplitsByUserInGroup(1, 1);
  assert.equal(splits.length, 2);
  assert.ok(splits.every((s) => s.user_id === 1));
});

test('SettlementRepository: createSettlement inserts settlement', () => {
  const db = createTestDb();
  const repo = createSettlementRepository(db);

  const settlementId = repo.createSettlement({
    groupId: 1,
    payerId: 2,
    payeeId: 1,
    amountCents: 5000,
  });

  assert.equal(typeof settlementId, 'number');
  assert.ok(settlementId > 0);

  const settlement = repo.findSettlementById(settlementId);
  assert.ok(settlement);
  assert.equal(settlement.id, settlementId);
  assert.equal(settlement.group_id, 1);
  assert.equal(settlement.payer_id, 2);
  assert.equal(settlement.payee_id, 1);
  assert.equal(settlement.amount_cents, 5000);
});

test('SettlementRepository: findSettlementsByGroup returns all settlements for group', () => {
  const db = createTestDb();
  const repo = createSettlementRepository(db);

  repo.createSettlement({ groupId: 1, payerId: 2, payeeId: 1, amountCents: 5000 });
  repo.createSettlement({ groupId: 1, payerId: 3, payeeId: 1, amountCents: 10000 });
  repo.createSettlement({ groupId: 2, payerId: 4, payeeId: 5, amountCents: 2000 });

  const settlements = repo.findSettlementsByGroup(1);
  assert.equal(settlements.length, 2);
  assert.ok(settlements.every((s) => s.group_id === 1));
});

test('SettlementRepository: findSettlementsBetweenUsers returns settlements between pair', () => {
  const db = createTestDb();
  const repo = createSettlementRepository(db);

  repo.createSettlement({ groupId: 1, payerId: 2, payeeId: 1, amountCents: 5000 });
  repo.createSettlement({ groupId: 1, payerId: 2, payeeId: 1, amountCents: 3000 });
  repo.createSettlement({ groupId: 1, payerId: 3, payeeId: 1, amountCents: 10000 });
  repo.createSettlement({ groupId: 1, payerId: 1, payeeId: 2, amountCents: 2000 }); // reverse direction

  const settlements = repo.findSettlementsBetweenUsers(1, 2, 1);
  assert.equal(settlements.length, 2);
  assert.ok(settlements.every((s) => s.payer_id === 2 && s.payee_id === 1));
});

test('SettlementRepository: findSettlementsBetweenUsers returns empty for non-existent pair', () => {
  const db = createTestDb();
  const repo = createSettlementRepository(db);

  const settlements = repo.findSettlementsBetweenUsers(1, 999, 1);
  assert.equal(settlements.length, 0);
});
