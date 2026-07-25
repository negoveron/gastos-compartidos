'use strict';

const express = require('express');

/**
 * Groups routes with JWT auth protection.
 *
 * @param {{
 *   groupsController: ReturnType<typeof import('./groups.controller').createGroupsController>,
 *   requireAuth: ReturnType<typeof import('../auth/auth.middleware').createRequireAuth>,
 * }} deps
 */
function createGroupsRoutes({ groupsController, requireAuth }) {
  const router = express.Router();

  // All routes require authentication
  router.use(requireAuth);

  router.post('/', groupsController.create);
  router.get('/', groupsController.listMyGroups);
  router.get('/:id/members', groupsController.getMembers);
  router.post('/:id/invite', groupsController.inviteMember);
  router.delete('/:id/members/:userId', groupsController.removeMember);

  return router;
}

module.exports = { createGroupsRoutes };