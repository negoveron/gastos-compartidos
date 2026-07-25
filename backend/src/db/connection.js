'use strict';

const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');

/**
 * Opens a SQLite connection at `dbPath`. Supports the special value
 * `:memory:` for tests (in-memory, non-persistent database).
 *
 * @param {string} dbPath
 * @returns {import('better-sqlite3').Database}
 */
function createConnection(dbPath) {
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return db;
}

module.exports = { createConnection };
