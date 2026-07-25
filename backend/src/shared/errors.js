'use strict';

/**
 * Base application error. Carries the HTTP status, a stable machine-readable
 * `code`, a human-readable `message` (Spanish, user-facing), and optional
 * `details` (e.g. field-level validation errors).
 */
class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function ValidationError(details) {
  return new AppError(400, 'VALIDATION_ERROR', 'Revisá los datos ingresados', details);
}

function EmailAlreadyRegisteredError() {
  return new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'Ese email ya está registrado');
}

function InvalidCredentialsError() {
  return new AppError(401, 'INVALID_CREDENTIALS', 'Email o contraseña incorrectos');
}

function AuthTokenMissingError() {
  return new AppError(401, 'AUTH_TOKEN_MISSING', 'Falta el token de autenticación');
}

function AuthTokenMalformedError() {
  return new AppError(401, 'AUTH_TOKEN_MALFORMED', 'Token de autenticación inválido');
}

function AuthTokenExpiredError() {
  return new AppError(401, 'AUTH_TOKEN_EXPIRED', 'Tu sesión expiró');
}

function AuthTokenInvalidError() {
  return new AppError(401, 'AUTH_TOKEN_INVALID', 'Token de autenticación inválido');
}

function InternalError() {
  return new AppError(500, 'INTERNAL_ERROR', 'Error interno del servidor');
}

function NotAuthorizedError(message) {
  return new AppError(403, 'NOT_AUTHORIZED', message || 'No tenés permiso para esta operación');
}

function GroupNotFoundError() {
  return new AppError(404, 'GROUP_NOT_FOUND', 'Grupo no encontrado');
}

function EmailNotFoundError(email) {
  return new AppError(404, 'EMAIL_NOT_FOUND', `Email no encontrado: ${email} - el usuario debe tener una cuenta antes de ser invitado a un grupo`);
}

module.exports = {
  AppError,
  ValidationError,
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
  AuthTokenMissingError,
  AuthTokenMalformedError,
  AuthTokenExpiredError,
  AuthTokenInvalidError,
  InternalError,
  NotAuthorizedError,
  GroupNotFoundError,
  EmailNotFoundError,
};
