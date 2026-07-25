import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { TokenStorage } from './token.storage';
import { AuthResponse, LoginPayload, RegisterPayload, User } from './auth.models';

/**
 * Sole reader/writer of the auth token (via TokenStorage) and the
 * single source of truth for the current-user/auth state in the app.
 * Components and the auth guard read state from here, never from
 * localStorage directly.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;
  private readonly currentUserSubject = new BehaviorSubject<User | null>(null);

  /** Emits the current authenticated user, or null when logged out. */
  readonly currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private tokenStorage: TokenStorage) {}

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  /** Synchronous check based on token presence — used by the guard. */
  isAuthenticated(): boolean {
    return !!this.tokenStorage.getToken();
  }

  /** Registers a new account. Backend auto-logs-in: the response already includes a usable token. */
  register(payload: RegisterPayload): Observable<User> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, payload).pipe(
      tap((res) => this.setSession(res)),
      map((res) => res.user)
    );
  }

  login(credentials: LoginPayload): Observable<User> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, credentials).pipe(
      tap((res) => this.setSession(res)),
      map((res) => res.user)
    );
  }

  /** Fetches the current user from the backend and hydrates currentUser$ (e.g. after a page reload). */
  me(): Observable<User> {
    return this.http.get<{ user: User }>(`${this.baseUrl}/me`).pipe(
      tap((res) => this.currentUserSubject.next(res.user)),
      map((res) => res.user)
    );
  }

  logout(): void {
    this.tokenStorage.clearToken();
    this.currentUserSubject.next(null);
  }

  private setSession(res: AuthResponse): void {
    this.tokenStorage.setToken(res.token);
    this.currentUserSubject.next(res.user);
  }
}
