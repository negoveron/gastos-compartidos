'use strict';

const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./shared/error-handler');

/**
 * Builds the Express app. Deliberately env-free (never reads
 * `process.env` directly) and exported for tests — it never calls
 * `.listen()`. `server.js` is the only file that touches env vars and
 * starts listening.
 *
 * @param {{
 *   config: { corsOrigins: string[] },
 *   authRouter: import('express').Router,
 * }} deps
 */
function createApp({ config, authRouter }) {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: false,
    })
  );
  app.use(express.json());

  app.use('/api/auth', authRouter);

  app.use((req, res, next) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Recurso no encontrado',
      },
    });
  });

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
