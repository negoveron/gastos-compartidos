'use strict';

const {
  validateCreateGroupInput,
  validateInviteMemberInput,
} = require('./groups.validation');
const {
  ValidationError,
  NotAuthorizedError,
  EmailNotFoundError,
  GroupNotFoundError,
} = require('../../shared/errors');

function toPublicGroup(row, userId) {
  return {
    id: row.id,
    nombre: row.nombre,
    ownerId: row.owner_id,
    isOwner: row.owner_id === userId,
  };
}

function toPublicMember(row, ownerId) {
  return {
    userId: row.user_id,
    email: row.email,
    nombre: row.nombre,
    isOwner: row.user_id === ownerId,
  };
}

/**
 * Groups service with business logic.
 *
 * @param {{
 *   groupsRepository: ReturnType<typeof import('./groups.repository').createGroupsRepository>,
 * }} deps
 */
function createGroupsService({ groupsRepository }) {
  return {
    /**
     * Creates a new group with the user as owner.
     */
    async create({ nombre, ownerId }) {
      const result = validateCreateGroupInput({ nombre });
      if (!result.valid) {
        throw ValidationError(result.details);
      }

      const group = groupsRepository.create({
        nombre: result.data.nombre,
        ownerId,
      });

       return toPublicGroup(group, ownerId);
    },

    /**
     * Lists all groups for the authenticated user.
     */
    async listMyGroups(userId) {
      const rows = groupsRepository.findByMember(userId);
       return rows.map((row) => toPublicGroup(row, userId));
    },

    /**
     * Invites a user to a group by email.
     * Requires the inviter to be the owner of the group.
     * Returns explicit error if email not found.
     */
    async inviteMember({ groupId, email, inviterId }) {
      const validation = validateInviteMemberInput({ email });
      if (!validation.valid) {
        throw ValidationError(validation.details);
      }

      const group = groupsRepository.findById(groupId);
      if (!group) {
        throw GroupNotFoundError();
      }

      if (group.owner_id !== inviterId) {
        throw NotAuthorizedError('Solo el owner puede invitar miembros');
      }

      const user = groupsRepository.findUserByEmail(validation.data.email);
      if (!user) {
        throw EmailNotFoundError(validation.data.email);
      }

      if (user.id === inviterId) {
        // Already a member (owner), nothing to do
        return;
      }

      groupsRepository.addMember({ groupId, userId: user.id });
    },

    /**
     * Gets all members of a group.
     */
    async getMembers({ groupId, requesterId }) {
      const members = groupsRepository.getMembers(groupId);

      // Check if requester is a member of the group
      const isMember = members.some((m) => m.user_id === requesterId);
      if (!isMember) {
        throw NotAuthorizedError('No tenés acceso a este grupo');
      }

      // Get ownerId from the group
      const group = groupsRepository.findById(groupId);
      return members.map((m) => toPublicMember(m, group.owner_id));
    },

    /**
     * Removes a member from a group.
     * Only the owner can remove members.
     * Owner cannot remove themselves.
     */
    async removeMember({ groupId, userId, removerId }) {
      const group = groupsRepository.findById(groupId);
      if (!group) {
        throw GroupNotFoundError();
      }

      if (group.owner_id !== removerId) {
        throw NotAuthorizedError('Solo el owner puede remover miembros');
      }

      if (userId === group.owner_id) {
        throw NotAuthorizedError('El owner no puede removerse a sí mismo');
      }

      groupsRepository.removeMember({ groupId, userId });
    },
  };
}

module.exports = { createGroupsService, toPublicGroup, toPublicMember };