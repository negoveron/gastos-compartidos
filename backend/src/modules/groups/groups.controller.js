'use strict';

/**
 * Groups controller handling request/response logic.
 *
 * @param {{ groupsService: ReturnType<typeof import('./groups.service').createGroupsService> }} deps
 */
function createGroupsController({ groupsService }) {
  return {
    async create(req, res, next) {
      try {
        const { nombre } = req.body || {};
        const result = await groupsService.create({
          nombre,
          ownerId: req.user.id,
        });
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    },

    async listMyGroups(req, res, next) {
      try {
        const groups = await groupsService.listMyGroups(req.user.id);
        res.status(200).json({ groups });
      } catch (err) {
        next(err);
      }
    },

    async getMembers(req, res, next) {
      try {
        const groupId = Number(req.params.id);
        const members = await groupsService.getMembers({
          groupId,
          requesterId: req.user.id,
        });
        res.status(200).json({ members });
      } catch (err) {
        next(err);
      }
    },

    async inviteMember(req, res, next) {
      try {
        const groupId = Number(req.params.id);
        const { email } = req.body || {};
        await groupsService.inviteMember({
          groupId,
          email,
          inviterId: req.user.id,
        });
        res.status(200).json({ success: true });
      } catch (err) {
        next(err);
      }
    },

    async removeMember(req, res, next) {
      try {
        const groupId = Number(req.params.id);
        const userId = Number(req.params.userId);
        await groupsService.removeMember({
          groupId,
          userId,
          removerId: req.user.id,
        });
        res.status(200).json({ success: true });
      } catch (err) {
        next(err);
      }
    },
  };
}

module.exports = { createGroupsController };