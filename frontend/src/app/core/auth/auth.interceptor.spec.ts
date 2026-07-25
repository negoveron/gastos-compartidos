import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { environment } from '../../../environments/environment';
import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { TokenStorage } from './token.storage';

describe('AuthInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let tokenStorage: TokenStorage;
  let authService: AuthService;
  let router: Router;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  const apiUrl = `${environment.apiBaseUrl}/some-resource`;

  beforeEach(() => {
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        { provide: MatSnackBar, useValue: snackBarSpy },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorage);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    tokenStorage.clearToken();
  });

  afterEach(() => {
    httpMock.verify();
    tokenStorage.clearToken();
  });

  it('attaches the Bearer token to requests targeting the API base URL', () => {
    tokenStorage.setToken('my-token');

    http.get(apiUrl).subscribe();

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.headers.get('Authorization')).toBe('Bearer my-token');
    req.flush({});
  });

  it('does not attach a header when there is no token', () => {
    http.get(apiUrl).subscribe();

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('on AUTH_TOKEN_EXPIRED: logs out, shows a notice, and navigates to /login', () => {
    tokenStorage.setToken('expired-token');
    const navigateSpy = spyOn(router, 'navigate');

    http.get(apiUrl).subscribe({ error: () => undefined });

    const req = httpMock.expectOne(apiUrl);
    req.flush(
      { error: { code: 'AUTH_TOKEN_EXPIRED', message: 'Token expired' } },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(tokenStorage.getToken()).toBeNull();
    expect(authService.currentUserValue).toBeNull();
    expect(snackBarSpy.open).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('rethrows INVALID_CREDENTIALS without logging out or navigating', () => {
    const navigateSpy = spyOn(router, 'navigate');
    let receivedError: unknown;

    http.get(apiUrl).subscribe({ error: (err) => (receivedError = err) });

    const req = httpMock.expectOne(apiUrl);
    req.flush(
      { error: { code: 'INVALID_CREDENTIALS', message: 'Email o contraseña incorrectos' } },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(receivedError).toBeTruthy();
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(snackBarSpy.open).not.toHaveBeenCalled();
  });
});
