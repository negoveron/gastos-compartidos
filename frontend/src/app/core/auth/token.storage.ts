import { Injectable } from '@angular/core';

const TOKEN_KEY = 'gc.auth.token';

/**
 * Thin wrapper around localStorage for the auth token.
 * This is the ONLY place allowed to touch localStorage for auth purposes;
 * AuthService is the only consumer.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorage {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }
}
