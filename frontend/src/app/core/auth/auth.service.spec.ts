import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { TokenStorage } from './token.storage';
import { User } from './auth.models';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let tokenStorage: TokenStorage;

  const baseUrl = `${environment.apiBaseUrl}/auth`;
  const user: User = { id: 1, email: 'ana@example.com', nombre: 'Ana' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorage);
    tokenStorage.clearToken();
  });

  afterEach(() => {
    httpMock.verify();
    tokenStorage.clearToken();
  });

  it('register() stores the token and emits the user (auto-login)', (done) => {
    service.register({ email: user.email, password: 'secret123', nombre: 'Ana' }).subscribe((result) => {
      expect(result).toEqual(user);
      expect(tokenStorage.getToken()).toBe('token-abc');
      expect(service.currentUserValue).toEqual(user);
      done();
    });

    const req = httpMock.expectOne(`${baseUrl}/register`);
    expect(req.request.method).toBe('POST');
    req.flush({ user, token: 'token-abc' });
  });

  it('login() stores the token and emits the user', (done) => {
    service.login({ email: user.email, password: 'secret123' }).subscribe((result) => {
      expect(result).toEqual(user);
      expect(tokenStorage.getToken()).toBe('token-xyz');
      done();
    });

    const req = httpMock.expectOne(`${baseUrl}/login`);
    expect(req.request.method).toBe('POST');
    req.flush({ user, token: 'token-xyz' });
  });

  it('me() hydrates currentUser$ from the backend', (done) => {
    service.me().subscribe((result) => {
      expect(result).toEqual(user);
      expect(service.currentUserValue).toEqual(user);
      done();
    });

    const req = httpMock.expectOne(`${baseUrl}/me`);
    expect(req.request.method).toBe('GET');
    req.flush({ user });
  });

  it('logout() clears the token and current user', () => {
    tokenStorage.setToken('some-token');
    expect(service.isAuthenticated()).toBeTrue();

    service.logout();

    expect(service.isAuthenticated()).toBeFalse();
    expect(service.currentUserValue).toBeNull();
  });

  it('isAuthenticated() reflects token presence', () => {
    expect(service.isAuthenticated()).toBeFalse();
    tokenStorage.setToken('t');
    expect(service.isAuthenticated()).toBeTrue();
  });
});
