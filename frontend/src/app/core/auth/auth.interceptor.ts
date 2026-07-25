import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { TokenStorage } from './token.storage';

const SESSION_EXPIRED_CODE = 'AUTH_TOKEN_EXPIRED';
const OTHER_TOKEN_ERROR_CODES = ['AUTH_TOKEN_MISSING', 'AUTH_TOKEN_MALFORMED', 'AUTH_TOKEN_INVALID'];

/**
 * Attaches the Bearer token to requests targeting the API base URL.
 * On AUTH_TOKEN_EXPIRED, shows a session-expiry notice THEN redirects to /login
 * (never a silent redirect). Other errors (INVALID_CREDENTIALS,
 * EMAIL_ALREADY_REGISTERED, VALIDATION_ERROR, ...) are rethrown for the
 * calling component to handle.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private tokenStorage: TokenStorage, private authService: AuthService, private router: Router, private snackBar: MatSnackBar) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const isApiRequest = req.url.startsWith(environment.apiBaseUrl);
    const token = this.tokenStorage.getToken();

    const authReq = isApiRequest && token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

    return next.handle(authReq).pipe(
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          const code = error.error?.error?.code;

          if (code === SESSION_EXPIRED_CODE) {
            this.authService.logout();
            this.snackBar.open('Tu sesión expiró. Iniciá sesión nuevamente.', 'Cerrar', { duration: 5000 });
            this.router.navigate(['/login']);
          } else if (OTHER_TOKEN_ERROR_CODES.includes(code)) {
            this.authService.logout();
            this.router.navigate(['/login']);
          }
        }

        return throwError(() => error);
      })
    );
  }
}
