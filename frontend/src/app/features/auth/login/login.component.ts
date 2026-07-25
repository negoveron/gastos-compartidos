import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';

const GENERIC_LOGIN_ERROR = 'Email o contraseña incorrectos.';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  readonly form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  submitting = false;
  /**
   * Single generic message for ANY login failure (unknown email or wrong
   * password) — the backend never distinguishes the two and neither must the UI.
   */
  errorMessage: string | null = null;

  private readonly returnUrl: string;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router, private route: ActivatedRoute) {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/home';
  }

  submit(): void {
    if (this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = null;
    this.submitting = true;

    const { email, password } = this.form.getRawValue();

    this.authService.login({ email, password }).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting = false;
        // INVALID_CREDENTIALS and any other login failure show the same
        // generic message — never reveal whether the email exists.
        this.errorMessage = err.error?.error?.message ?? GENERIC_LOGIN_ERROR;
      },
    });
  }
}
