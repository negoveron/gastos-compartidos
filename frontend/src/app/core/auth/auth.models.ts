export interface User {
  id: number;
  email: string;
  nombre: string | null;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  nombre?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

export interface ApiError {
  error: ApiErrorBody;
}

export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_REGISTERED: 'EMAIL_ALREADY_REGISTERED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
  AUTH_TOKEN_MALFORMED: 'AUTH_TOKEN_MALFORMED',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
} as const;
