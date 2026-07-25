'use strict';

require('dotenv').config();

const { buildConfig } = require('./config/env');
const { createConnection } = require('./db/connection');
const { runMigrations } = require('./db/migrate');
const { createAuthModule } = require('./modules/auth');
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

const { router: authRouter } = createAuthModule({ db, config });
const app = createApp({ config, authRouter });

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`gastos-compartidos backend listening on port ${config.port} (${config.nodeEnv})`);
});
