import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const runGuard: (url: string) => UrlTree | boolean = (url) =>
    TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url } as never) as UrlTree | boolean
    );

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated']);

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [{ provide: AuthService, useValue: authServiceSpy }],
    });
  });

  it('allows navigation when authenticated', () => {
    authServiceSpy.isAuthenticated.and.returnValue(true);

    const result = runGuard('/home');

    expect(result).toBeTrue();
  });

  it('redirects to /login with returnUrl when not authenticated', () => {
    authServiceSpy.isAuthenticated.and.returnValue(false);

    const result = runGuard('/home') as UrlTree;
    const router = TestBed.inject(Router);
    const serialized = router.serializeUrl(result);

    expect(serialized).toContain('/login');
    expect(serialized).toContain('returnUrl=%2Fhome');
  });
});
