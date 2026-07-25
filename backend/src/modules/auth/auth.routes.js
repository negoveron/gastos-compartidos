'use strict';

const express = require('express');

/**
 * @param {{
 *   authController: ReturnType<typeof import('./auth.controller').createAuthController>,
 *   requireAuth: ReturnType<typeof import('./auth.middleware').createRequireAuth>,
 * }} deps
 */
function createAuthRoutes({ authController, requireAuth }) {
  const router = express.Router();

  router.post('/register', authController.register);
  router.post('/login', authController.login);
  router.get('/me', requireAuth, authController.me);

  return router;
}

module.exports = { createAuthRoutes };
