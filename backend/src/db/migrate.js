'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createConnection } = require('./connection');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Applies every not-yet-applied `*.sql` file in `migrations/` (in filename
 * order) inside its own transaction, recording the filename in
 * `schema_migrations` so re-running is a no-op. Safe to call on every boot.
 *
 * @param {import('better-sqlite3').Database} db
 */
function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    TEXT PRIMARY KEY,
      applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = new Set(
    db.prepare('SELECT filename FROM schema_migrations').all().map((row) => row.filename)
  );

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((filename) => filename.endsWith('.sql'))
    .sort();

  for (const filename of files) {
    if (applied.has(filename)) continue;

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');

    const applyMigration = db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (filename) VALUES (?)').run(filename);
    });

    applyMigration();
  }
}

// Allow running as a standalone script: `node src/db/migrate.js`
if (require.main === module) {
  require('dotenv').config();
  const dbPath = process.env.DB_PATH || './data/gastos.db';
  const db = createConnection(dbPath);
  runMigrations(db);
  db.close();
  // eslint-disable-next-line no-console
  console.log(`Migrations applied to ${dbPath}`);
}

module.exports = { runMigrations };
