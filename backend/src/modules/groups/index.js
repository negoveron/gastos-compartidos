'use strict';

const { createGroupsRepository } = require('./groups.repository');
const { createGroupsService } = require('./groups.service');
const { createGroupsController } = require('./groups.controller');
const { createGroupsRoutes } = require('./groups.routes');

/**
 * Composition root for the groups module.
 * Wires repository → service → controller → router.
 *
 * @param {{
 *   db: import('better-sqlite3').Database,
 *   requireAuth: ReturnType<typeof import('../auth/auth.middleware').createRequireAuth>,
 * }} deps
 */
function createGroupsModule({ db, requireAuth }) {
  const groupsRepository = createGroupsRepository(db);
  const groupsService = createGroupsService({ groupsRepository });
  const groupsController = createGroupsController({ groupsService });
  const router = createGroupsRoutes({ groupsController, requireAuth });

  return { router, groupsService };
}

module.exports = { createGroupsModule };