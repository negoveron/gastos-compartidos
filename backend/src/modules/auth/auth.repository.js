'use strict';

const { EmailAlreadyRegisteredError } = require('../../shared/errors');

// SQLite error code for a UNIQUE constraint violation via better-sqlite3.
const SQLITE_CONSTRAINT_UNIQUE = 'SQLITE_CONSTRAINT_UNIQUE';

/**
 * ONLY module allowed to contain SQL. Wraps a `better-sqlite3` connection
 * with the three operations the auth service needs.
 *
 * @param {import('better-sqlite3').Database} db
 */
function createAuthRepository(db) {
  const insertStmt = db.prepare(
    'INSERT INTO users (email, password_hash, nombre) VALUES (?, ?, ?)'
  );
  const findByEmailStmt = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE');
  const findByIdStmt = db.prepare('SELECT * FROM users WHERE id = ?');

  return {
    /**
     * Inserts a new user. Relies on the UNIQUE constraint on `email` to
     * enforce uniqueness (no SELECT-then-INSERT race) — a constraint
     * violation is mapped to `EmailAlreadyRegisteredError`.
     */
    insertUser({ email, passwordHash, nombre }) {
      try {
        const info = insertStmt.run(email, passwordHash, nombre);
        return findByIdStmt.get(info.lastInsertRowid);
      } catch (err) {
        if (err.code === SQLITE_CONSTRAINT_UNIQUE) {
          throw EmailAlreadyRegisteredError();
        }
        throw err;
      }
    },

    findByEmail(email) {
      return findByEmailStmt.get(email) || null;
    },

    findById(id) {
      return findByIdStmt.get(id) || null;
    },
  };
}

module.exports = { createAuthRepository };
