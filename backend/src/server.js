'use strict';

require('dotenv').config();

const { buildConfig } = require('./config/env');
const { createConnection } = require('./db/connection');
const { runMigrations } = require('./db/migrate');
const { createAuthModule } = require('./modules/auth');
const { createGroupsModule } = require('./modules/groups');
const { createExpensesModule } = require('./modules/expenses');
const { createApp } = require('./app');

const result = buildConfig(process.env);

if (!result.ok) {
  // eslint-disable-next-line no-console
  console.error('Invalid configuration:');
  for (const error of result.errors) {
    // eslint-disable-next-line no-console
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

const { config } = result;

const db = createConnection(config.dbPath);
runMigrations(db);

const { router: authRouter, requireAuth } = createAuthModule({ db, config });
const { router: groupsRouter } = createGroupsModule({ db, requireAuth });
const { router: expensesRouter } = createExpensesModule({ db, requireAuth });
const app = createApp({ config, authRouter, groupsRouter, expensesRouter });

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`gastos-compartidos backend listening on port ${config.port} (${config.nodeEnv})`);
});
