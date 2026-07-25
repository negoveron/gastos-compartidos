'use strict';

/**
 * Parses request bodies, calls the auth service, and shapes the HTTP
 * response. All error handling is delegated to the error middleware via
 * `next(err)` — no try/catch-and-respond here.
 *
 * @param {{ authService: ReturnType<typeof import('./auth.service').createAuthService> }} deps
 */
function createAuthController({ authService }) {
  return {
    async register(req, res, next) {
      try {
        const { email, password, nombre } = req.body || {};
        const result = await authService.register({ email, password, nombre });
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    },

    async login(req, res, next) {
      try {
        const { email, password } = req.body || {};
        const result = await authService.login({ email, password });
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },

    async me(req, res, next) {
      try {
        const user = await authService.getById(req.user.id);
        res.status(200).json({ user });
      } catch (err) {
        next(err);
      }
    },
  };
}

module.exports = { createAuthController };
