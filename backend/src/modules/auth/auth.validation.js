'use strict';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Lowercases + trims an email. This is the primary normalization mechanism;
 * the `COLLATE NOCASE` on the `users.email` column is defense in depth only.
 */
function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : email;
}

function isValidEmailShape(email) {
  return typeof email === 'string' && EMAIL_RE.test(email);
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH;
}

/**
 * Trims `nombre`; an empty string (or non-string) becomes `null`.
 */
function normalizeNombre(nombre) {
  if (typeof nombre !== 'string') return null;
  const trimmed = nombre.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Validates a register payload. Returns `{ valid: true, data }` or
 * `{ valid: false, details }` where `details` is a list of
 * `{ field, message }` entries suitable for the `VALIDATION_ERROR` envelope.
 */
function validateRegisterInput({ email, password, nombre }) {
  const details = [];
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmailShape(normalizedEmail)) {
    details.push({ field: 'email', message: 'El email no tiene un formato válido' });
  }

  if (!isValidPassword(password)) {
    details.push({ field: 'password', message: 'La contraseña debe tener al menos 8 caracteres' });
  }

  if (details.length > 0) {
    return { valid: false, details };
  }

  return {
    valid: true,
    data: {
      email: normalizedEmail,
      password,
      nombre: normalizeNombre(nombre),
    },
  };
}

/**
 * Validates a login payload (shape only — credentials are checked by the
 * service against the persisted user).
 */
function validateLoginInput({ email, password }) {
  const details = [];
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmailShape(normalizedEmail)) {
    details.push({ field: 'email', message: 'El email no tiene un formato válido' });
  }

  if (typeof password !== 'string' || password.length === 0) {
    details.push({ field: 'password', message: 'La contraseña es requerida' });
  }

  if (details.length > 0) {
    return { valid: false, details };
  }

  return {
    valid: true,
    data: { email: normalizedEmail, password },
  };
}

module.exports = {
  normalizeEmail,
  normalizeNombre,
  isValidEmailShape,
  isValidPassword,
  validateRegisterInput,
  validateLoginInput,
  MIN_PASSWORD_LENGTH,
};
