'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createExpenseService } = require('../src/modules/expenses/expense.service');
const { createSettlementService } = require('../src/modules/expenses/settlement.service');
const { createConnection } = require('../src/db/connection');
const { runMigrations } = require('../src/db/migrate');
const { createExpenseRepository } = require('../src/modules/expenses/expense.repository');
const { createSettlementRepository } = require('../src/modules/expenses/settlement.repository');
const { createGroupsRepository } = require('../src/modules/groups/groups.repository');
const { NotAuthorizedError, GroupNotFoundError, ValidationError } = require('../src/shared/errors');

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

function buildServices(db) {
  const expenseRepository = createExpenseRepository(db);
  const settlementRepository = createSettlementRepository(db);
  const groupsRepository = createGroupsRepository(db);

  const expenseService = createExpenseService({ expenseRepository, settlementRepository, groupsRepository });
  const settlementService = createSettlementService({ settlementRepository, expenseRepository, groupsRepository, db });

  return { expenseService, settlementService, expenseRepository, settlementRepository, groupsRepository };
}

// ============ ExpenseService Tests ============

test('ExpenseService.createExpense: succeeds with valid data and creates correct splits', async () => {
  const db = createTestDb();
  const { expenseService, expenseRepository } = buildServices(db);

  const result = await expenseService.createExpense({
    groupId: 1,
    payerId: 1,
    amountCents: 30000, // $300.00
    description: 'Cena',
    requesterId: 1,
  });

  assert.ok(result.id);
  assert.equal(result.groupId, 1);
  assert.equal(result.payerId, 1);
  assert.equal(result.amountCents, 30000);
  assert.equal(result.description, 'Cena');
  assert.equal(result.splits.length, 3);

  // Verify splits are correct (30000 / 3 = 10000 each)
  const totalSplits = result.splits.reduce((sum, s) => sum + s.amountCents, 0);
  assert.equal(totalSplits, 30000);
  assert.ok(result.splits.every((s) => s.amountCents === 10000));

  // Verify in database
  const expense = expenseRepository.findExpenseById(result.id);
  assert.ok(expense);
  const splits = expenseRepository.findSplitsByExpenseId(result.id);
  assert.equal(splits.length, 3);
});

test('ExpenseService.createExpense: applies rounding rule correctly (imperfect split)', async () => {
  const db = createTestDb();
  const { expenseService } = buildServices(db);

  const result = await expenseService.createExpense({
    groupId: 1,
    payerId: 1,
    amountCents: 10000, // $100.00, 3 members
    description: 'Café',
    requesterId: 1,
  });

  assert.equal(result.splits.length, 3);
  // 10000 / 3 = 3333 remainder 1 -> member 1 gets 3334, others 3333
  const sortedSplits = [...result.splits].sort((a, b) => a.userId - b.userId);
  assert.equal(sortedSplits[0].userId, 1);
  assert.equal(sortedSplits[0].amountCents, 3334);
  assert.equal(sortedSplits[1].amountCents, 3333);
  assert.equal(sortedSplits[2].amountCents, 3333);

  const total = result.splits.reduce((sum, s) => sum + s.amountCents, 0);
  assert.equal(total, 10000);
});

test('ExpenseService.createExpense: rejects non-member payer', async () => {
  const db = createTestDb();
  const { expenseService } = buildServices(db);

  await assert.rejects(
    () => expenseService.createExpense({
      groupId: 1,
      payerId: 4, // Not a member of group 1
      amountCents: 10000,
      description: 'Test',
      requesterId: 4,
    }),
    (err) => {
      assert.equal(err.status, 403);
      assert.equal(err.code, 'NOT_AUTHORIZED');
      return true;
    }
  );
});

test('ExpenseService.createExpense: rejects non-member requester', async () => {
  const db = createTestDb();
  const { expenseService } = buildServices(db);

  await assert.rejects(
    () => expenseService.createExpense({
      groupId: 1,
      payerId: 1,
      amountCents: 10000,
      description: 'Test',
      requesterId: 4, // Not a member
    }),
    (err) => {
      assert.equal(err.status, 403);
      assert.equal(err.code, 'NOT_AUTHORIZED');
      return true;
    }
  );
});

test('ExpenseService.createExpense: rejects non-existent group', async () => {
  const db = createTestDb();
  const { expenseService } = buildServices(db);

  await assert.rejects(
    () => expenseService.createExpense({
      groupId: 999,
      payerId: 1,
      amountCents: 10000,
      description: 'Test',
      requesterId: 1,
    }),
    (err) => {
      assert.equal(err.status, 404);
      assert.equal(err.code, 'GROUP_NOT_FOUND');
      return true;
    }
  );
});

test('ExpenseService.createExpense: validates amount is positive', async () => {
  const db = createTestDb();
  const { expenseService } = buildServices(db);

  await assert.rejects(
    () => expenseService.createExpense({
      groupId: 1,
      payerId: 1,
      amountCents: 0,
      description: 'Test',
      requesterId: 1,
    }),
    (err) => {
      assert.equal(err.status, 400);
      assert.equal(err.code, 'VALIDATION_ERROR');
      return true;
    }
  );
});

test('ExpenseService.createExpense: validates description is provided', async () => {
  const db = createTestDb();
  const { expenseService } = buildServices(db);

  await assert.rejects(
    () => expenseService.createExpense({
      groupId: 1,
      payerId: 1,
      amountCents: 10000,
      description: '',
      requesterId: 1,
    }),
    (err) => {
      assert.equal(err.status, 400);
      assert.equal(err.code, 'VALIDATION_ERROR');
      return true;
    }
  );
});

test('ExpenseService.createExpense: payer is included in splits', async () => {
  const db = createTestDb();
  const { expenseService } = buildServices(db);

  const result = await expenseService.createExpense({
    groupId: 1,
    payerId: 2, // User 2 pays
    amountCents: 30000,
    description: 'Test',
    requesterId: 2,
  });

  // Payer (user 2) should be in splits
  const payerSplit = result.splits.find((s) => s.userId === 2);
  assert.ok(payerSplit);
  assert.equal(payerSplit.amountCents, 10000);
});

// ============ SettlementService Tests ============

test('SettlementService.recordSettlement: succeeds with valid settlement', async () => {
  const db = createTestDb();
  const { expenseService, settlementService, expenseRepository } = buildServices(db);

  // Create expense: User 1 pays $30 for 3 people -> each owes $10
  // User 2 owes User 1 $10, User 3 owes User 1 $10
  await expenseService.createExpense({
    groupId: 1,
    payerId: 1,
    amountCents: 30000,
    description: 'Cena',
    requesterId: 1,
  });

  // User 2 settles $10 to User 1
  const result = await settlementService.recordSettlement({
    groupId: 1,
    payerId: 2,
    payeeId: 1,
    amountCents: 10000,
    requesterId: 2,
  });

  assert.ok(result.id);
  assert.equal(result.groupId, 1);
  assert.equal(result.payerId, 2);
  assert.equal(result.payeeId, 1);
  assert.equal(result.amountCents, 10000);
});

test('SettlementService.recordSettlement: rejects overpayment', async () => {
  const db = createTestDb();
  const { expenseService, settlementService } = buildServices(db);

  // Create expense: User 1 pays $30 for 3 people -> each owes $10
  // User 2 owes User 1 $10
  await expenseService.createExpense({
    groupId: 1,
    payerId: 1,
    amountCents: 30000,
    description: 'Cena',
    requesterId: 1,
  });

  // User 2 tries to pay $15 to User 1 (owes only $10)
  await assert.rejects(
    () => settlementService.recordSettlement({
      groupId: 1,
      payerId: 2,
      payeeId: 1,
      amountCents: 15000,
      requesterId: 2,
    }),
    (err) => {
      assert.equal(err.status, 400);
      assert.equal(err.code, 'VALIDATION_ERROR');
      // Check details array for the overpayment message
      const hasOverpaymentMessage = err.details.some(d => d.message.includes('Overpayment') || d.message.includes('sobrepago') || d.message.includes('excede'));
      assert.ok(hasOverpaymentMessage, `Expected overpayment message in details: ${JSON.stringify(err.details)}`);
      return true;
    }
  );
});

test('SettlementService.recordSettlement: rejects settlement from non-member', async () => {
  const db = createTestDb();
  const { expenseService, settlementService } = buildServices(db);

  await expenseService.createExpense({
    groupId: 1,
    payerId: 1,
    amountCents: 30000,
    description: 'Cena',
    requesterId: 1,
  });

  await assert.rejects(
    () => settlementService.recordSettlement({
      groupId: 1,
      payerId: 4, // Not a member
      payeeId: 1,
      amountCents: 10000,
      requesterId: 4,
    }),
    (err) => {
      assert.equal(err.status, 403);
      assert.equal(err.code, 'NOT_AUTHORIZED');
      return true;
    }
  );
});

test('SettlementService.recordSettlement: rejects settlement to non-member', async () => {
  const db = createTestDb();
  const { expenseService, settlementService } = buildServices(db);

  await expenseService.createExpense({
    groupId: 1,
    payerId: 1,
    amountCents: 30000,
    description: 'Cena',
    requesterId: 1,
  });

  await assert.rejects(
    () => settlementService.recordSettlement({
      groupId: 1,
      payerId: 2,
      payeeId: 4, // Not a member
      amountCents: 10000,
      requesterId: 2,
    }),
    (err) => {
      assert.equal(err.status, 403);
      assert.equal(err.code, 'NOT_AUTHORIZED');
      return true;
    }
  );
});

test('SettlementService.recordSettlement: rejects non-existent group', async () => {
  const db = createTestDb();
  const { settlementService } = buildServices(db);

  await assert.rejects(
    () => settlementService.recordSettlement({
      groupId: 999,
      payerId: 1,
      payeeId: 2,
      amountCents: 10000,
      requesterId: 1,
    }),
    (err) => {
      assert.equal(err.status, 404);
      assert.equal(err.code, 'GROUP_NOT_FOUND');
      return true;
    }
  );
});

test('SettlementService.recordSettlement: validates positive amount', async () => {
  const db = createTestDb();
  const { settlementService } = buildServices(db);

  await assert.rejects(
    () => settlementService.recordSettlement({
      groupId: 1,
      payerId: 1,
      payeeId: 2,
      amountCents: 0,
      requesterId: 1,
    }),
    (err) => {
      assert.equal(err.status, 400);
      assert.equal(err.code, 'VALIDATION_ERROR');
      return true;
    }
  );
});

test('SettlementService.recordSettlement: multiple settlements accumulate correctly', async () => {
  const db = createTestDb();
  const { expenseService, settlementService } = buildServices(db);

  // User 1 pays $30 for 3 people -> User 2 owes $10, User 3 owes $10
  await expenseService.createExpense({
    groupId: 1,
    payerId: 1,
    amountCents: 30000,
    description: 'Cena',
    requesterId: 1,
  });

  // User 2 pays $5 to User 1
  await settlementService.recordSettlement({
    groupId: 1,
    payerId: 2,
    payeeId: 1,
    amountCents: 5000,
    requesterId: 2,
  });

  // User 2 pays another $5 to User 1 (total $10)
  const result = await settlementService.recordSettlement({
    groupId: 1,
    payerId: 2,
    payeeId: 1,
    amountCents: 5000,
    requesterId: 2,
  });

  assert.equal(result.amountCents, 5000);

  // Now User 2 owes $0, should not be able to pay more
  await assert.rejects(
    () => settlementService.recordSettlement({
      groupId: 1,
      payerId: 2,
      payeeId: 1,
      amountCents: 1000,
      requesterId: 2,
    }),
    (err) => {
      assert.equal(err.status, 400);
      assert.equal(err.code, 'VALIDATION_ERROR');
      return true;
    }
  );
});

test('SettlementService.recordSettlement: FIFO - settlements reduce oldest debts first', async () => {
  const db = createTestDb();
  const { expenseService, settlementService } = buildServices(db);

  // Group 1 has 3 members (1, 2, 3)
  // Expense 1: User 1 pays $10 (10000 cents) for "Coffee" -> split 3 ways: 3334, 3333, 3333
  //   User 2 owes User 1: 3333 cents
  // Expense 2: User 1 pays $20 (20000 cents) for "Lunch" -> split 3 ways: 6667, 6667, 6666
  //   User 2 owes User 1: 6667 cents
  // Total User 2 owes User 1: 3333 + 6667 = 10000 cents
  await expenseService.createExpense({
    groupId: 1,
    payerId: 1,
    amountCents: 10000,
    description: 'Coffee',
    requesterId: 1,
  });

  await expenseService.createExpense({
    groupId: 1,
    payerId: 1,
    amountCents: 20000,
    description: 'Lunch',
    requesterId: 1,
  });

  // Total: User 2 owes User 1 10000 cents
  // User 2 pays 10000 (full settlement)
  const result = await settlementService.recordSettlement({
    groupId: 1,
    payerId: 2,
    payeeId: 1,
    amountCents: 10000,
    requesterId: 2,
  });

  assert.equal(result.amountCents, 10000);

  // Should not be able to pay more
  await assert.rejects(
    () => settlementService.recordSettlement({
      groupId: 1,
      payerId: 2,
      payeeId: 1,
      amountCents: 1000,
      requesterId: 2,
    }),
    (err) => {
      assert.equal(err.status, 400);
      assert.equal(err.code, 'VALIDATION_ERROR');
      return true;
    }
  );
});

// ============ Regression Tests for Critical Bugs ============

// R3-001: FIFO Balance Calculation Bug
// The remainingAmount tracking in calculateBalances was mathematically incorrect
test('ExpenseService.calculateBalances: R3-001 - partial settlement correctly reduces FIFO breakdown', async () => {
  const db = createTestDb();
  const { expenseService, settlementService, expenseRepository } = buildServices(db);

  // Group 1 has 3 members (1, 2, 3)
  // Expense 1: User 1 pays $100 (10000 cents) -> split 3 ways: 3334, 3333, 3333
  //   User 2 owes User 1: 3333 cents
  // Expense 2: User 1 pays $200 (20000 cents) -> split 3 ways: 6667, 6667, 6666
  //   User 2 owes User 1: 6667 cents
  // Total User 2 owes User 1: 3333 + 6667 = 10000 cents
  await expenseService.createExpense({
    groupId: 1,
    payerId: 1,
    amountCents: 10000,
    description: 'Expense 1',
    requesterId: 1,
  });

  await expenseService.createExpense({
    groupId: 1,
    payerId: 1,
    amountCents: 20000,
    description: 'Expense 2',
    requesterId: 1,
  });

  // User 2 pays $75 (7500 cents) - partial settlement
  // FIFO: should fully pay Expense 1 (3333) and 4167 towards Expense 2
  // Remaining on Expense 2: 6667 - 4167 = 2500
  await settlementService.recordSettlement({
    groupId: 1,
    payerId: 2,
    payeeId: 1,
    amountCents: 7500,
    requesterId: 2,
  });

  // Calculate balances - should show remaining debt of 2500 (all from Expense 2)
  const { expenseService: expenseService2 } = buildServices(db);
  const balances = await expenseService2.calculateBalances({ groupId: 1, requesterId: 1 });

  // Find the balance for User 2 -> User 1
  const debt = balances.find(b => b.debtorId === 2 && b.creditorId === 1);
  assert.ok(debt, 'Debt from User 2 to User 1 should exist');
  assert.equal(debt.totalCents, 2500, 'Total remaining debt should be 2500 cents');

  // Breakdown should only have Expense 2 with 2500 cents (Expense 1 fully paid)
  assert.equal(debt.breakdown.length, 1, 'Breakdown should only have 1 expense (Expense 2)');
  assert.equal(debt.breakdown[0].amountCents, 2500, 'Remaining amount on Expense 2 should be 2500');
  assert.equal(debt.breakdown[0].description, 'Expense 2', 'Should be Expense 2');
});

// R3-001: Multiple partial settlements - verify remainingAmount tracks correctly across settlements
test('ExpenseService.calculateBalances: R3-001 - multiple partial settlements track remaining correctly', async () => {
  const db = createTestDb();
  const { expenseService, settlementService } = buildServices(db);

  // Group 1 has 3 members (1, 2, 3)
  // Expense 1: User 1 pays $100 (10000 cents) -> User 2 owes 3333
  // Expense 2: User 1 pays $200 (20000 cents) -> User 2 owes 6667
  // Total: 10000
  await expenseService.createExpense({
    groupId: 1,
    payerId: 1,
    amountCents: 10000,
    description: 'Expense 1',
    requesterId: 1,
  });

  await expenseService.createExpense({
    groupId: 1,
    payerId: 1,
    amountCents: 20000,
    description: 'Expense 2',
    requesterId: 1,
  });

  // First settlement: $3000 (pays part of Expense 1)
  await settlementService.recordSettlement({
    groupId: 1,
    payerId: 2,
    payeeId: 1,
    amountCents: 3000,
    requesterId: 2,
  });

  // Second settlement: $3000 (finishes Expense 1 (333 left) and 2667 towards Expense 2)
  // Remaining on Expense 2: 6667 - 2667 = 4000
  await settlementService.recordSettlement({
    groupId: 1,
    payerId: 2,
    payeeId: 1,
    amountCents: 3000,
    requesterId: 2,
  });

  // Remaining debt should be 4000 (all from Expense 2)
  const { expenseService: expenseService2 } = buildServices(db);
  const balances = await expenseService2.calculateBalances({ groupId: 1, requesterId: 1 });

  const debt = balances.find(b => b.debtorId === 2 && b.creditorId === 1);
  assert.ok(debt);
  assert.equal(debt.totalCents, 4000, 'Total remaining debt should be 4000 cents');
  assert.equal(debt.breakdown.length, 1, 'Only Expense 2 should remain');
  assert.equal(debt.breakdown[0].amountCents, 4000);
  assert.equal(debt.breakdown[0].description, 'Expense 2');
});

// R3-002: Settlement Race Condition
// Simulate concurrent settlement attempts to verify transaction prevents overpayment
test('SettlementService.recordSettlement: R3-002 - concurrent settlements prevented by transaction', async () => {
  const db = createTestDb();
  const { expenseService, settlementService, settlementRepository } = buildServices(db);

  // Group 1 has 3 members (1, 2, 3)
  // User 1 pays $100 (10000 cents) for 3 people -> User 2 owes 3333 cents
  await expenseService.createExpense({
    groupId: 1,
    payerId: 1,
    amountCents: 10000,
    description: 'Shared expense',
    requesterId: 1,
  });

  // Net debt is 3333 cents (User 2 owes User 1)
  // Attempt two concurrent settlements of 3333 each
  // Only one should succeed, the second should fail with overpayment error

  const settlement1 = settlementService.recordSettlement({
    groupId: 1,
    payerId: 2,
    payeeId: 1,
    amountCents: 3333,
    requesterId: 2,
  });

  const settlement2 = settlementService.recordSettlement({
    groupId: 1,
    payerId: 2,
    payeeId: 1,
    amountCents: 3333,
    requesterId: 2,
  });

  // Wait for both to complete
  const results = await Promise.allSettled([settlement1, settlement2]);

  // Exactly one should succeed, one should fail
  const successful = results.filter(r => r.status === 'fulfilled');
  const failed = results.filter(r => r.status === 'rejected');

  assert.equal(successful.length, 1, 'Exactly one settlement should succeed');
  assert.equal(failed.length, 1, 'Exactly one settlement should fail');

  // The failed one should be an overpayment error
  const failedError = failed[0].reason;
  assert.equal(failedError.status, 400);
  assert.equal(failedError.code, 'VALIDATION_ERROR');
  const hasOverpaymentMessage = failedError.details.some(d => 
    d.message.includes('Overpayment') || d.message.includes('sobrepago') || d.message.includes('excede')
  );
  assert.ok(hasOverpaymentMessage, `Expected overpayment message: ${JSON.stringify(failedError.details)}`);

  // Verify only one settlement exists in DB
  const settlements = settlementRepository.findSettlementsBetweenUsers(1, 2, 1);
  assert.equal(settlements.length, 1, 'Only one settlement should be recorded');
  assert.equal(settlements[0].amount_cents, 3333);
});

// R3-002: Verify transaction uses BEGIN IMMEDIATE (exclusive lock)
// This test verifies the lock behavior by checking that rapid sequential calls
// are properly serialized and the second sees the first's settlement
test('SettlementService.recordSettlement: R3-002 - sequential settlements properly see previous settlement', async () => {
  const db = createTestDb();
  const { expenseService, settlementService } = buildServices(db);

  // Group 1 has 3 members (1, 2, 3)
  // User 1 pays $100 (10000 cents) for 3 people -> User 2 owes 3333 cents
  await expenseService.createExpense({
    groupId: 1,
    payerId: 1,
    amountCents: 10000,
    description: 'Shared expense',
    requesterId: 1,
  });

  // First settlement: 2000 (remaining debt: 1333)
  await settlementService.recordSettlement({
    groupId: 1,
    payerId: 2,
    payeeId: 1,
    amountCents: 2000,
    requesterId: 2,
  });

  // Second settlement: 1333 (should succeed, remaining debt is 1333)
  const result = await settlementService.recordSettlement({
    groupId: 1,
    payerId: 2,
    payeeId: 1,
    amountCents: 1333,
    requesterId: 2,
  });

  assert.equal(result.amountCents, 1333);

  // Third settlement: 1 (should fail, debt is now 0)
  await assert.rejects(
    () => settlementService.recordSettlement({
      groupId: 1,
      payerId: 2,
      payeeId: 1,
      amountCents: 1000,
      requesterId: 2,
    }),
    (err) => {
      assert.equal(err.status, 400);
      assert.equal(err.code, 'VALIDATION_ERROR');
      return true;
    }
  );
});
