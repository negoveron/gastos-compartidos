import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { ApiErrorDetail } from '../../../core/auth/auth.models';

const DUPLICATE_EMAIL_MESSAGE = 'Ese email ya está registrado.';
const GENERIC_ERROR_MESSAGE = 'No se pudo completar el registro. Intentá de nuevo.';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {
  readonly form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    nombre: [''],
  });

  submitting = false;
  /** Form-level error (e.g. duplicate email or a generic failure). */
  formError: string | null = null;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {}

  submit(): void {
    if (this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.formError = null;
    this.submitting = true;

    const { email, password, nombre } = this.form.getRawValue();
    const payload = nombre ? { email, password, nombre } : { email, password };

    // Auto-login: register() already returns a usable token, no separate login call needed.
    this.authService.register(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigateByUrl('/home');
      },
      error: (err: HttpErrorResponse) => {
        this.submitting = false;
        this.handleError(err);
      },
    });
  }

  private handleError(err: HttpErrorResponse): void {
    const apiError = err.error?.error;

    if (apiError?.code === 'EMAIL_ALREADY_REGISTERED') {
      this.formError = DUPLICATE_EMAIL_MESSAGE;
      this.form.controls['email'].setErrors({ duplicate: true });
      return;
    }

    if (apiError?.code === 'VALIDATION_ERROR' && Array.isArray(apiError.details)) {
      this.applyFieldErrors(apiError.details);
      return;
    }

    this.formError = apiError?.message ?? GENERIC_ERROR_MESSAGE;
  }

  private applyFieldErrors(details: ApiErrorDetail[]): void {
    let anyFieldMatched = false;

    for (const detail of details) {
      const control = this.form.controls[detail.field];
      if (control) {
        control.setErrors({ server: detail.message });
        anyFieldMatched = true;
      }
    }

    if (!anyFieldMatched) {
      this.formError = details.map((d) => d.message).join(' ');
    }
  }
}
