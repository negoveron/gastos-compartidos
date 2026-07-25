'use strict';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates a group creation payload.
 * Returns { valid: true } or { valid: false, details: [{ field, message }] }.
 */
function validateCreateGroupInput({ nombre }) {
  const details = [];

  if (typeof nombre !== 'string' || nombre.trim().length === 0) {
    details.push({ field: 'nombre', message: 'El nombre del grupo es requerido' });
  }

  if (details.length > 0) {
    return { valid: false, details };
  }

  return { valid: true, data: { nombre: nombre.trim() } };
}

/**
 * Validates an invite member payload.
 */
function validateInviteMemberInput({ email }) {
  const details = [];

  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    details.push({ field: 'email', message: 'El email no tiene un formato válido' });
  }

  if (details.length > 0) {
    return { valid: false, details };
  }

  return { valid: true, data: { email: email.trim().toLowerCase() } };
}

module.exports = {
  validateCreateGroupInput,
  validateInviteMemberInput,
};