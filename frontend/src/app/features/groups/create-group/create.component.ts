import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { GroupsService } from '../../../core/groups/groups.service';

@Component({
  selector: 'app-create-group',
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.scss'],
})
export class CreateGroupComponent {
  readonly form: FormGroup = this.fb.group({
    nombre: ['', [Validators.required]],
  });

  submitting = false;
  errorMessage: string | null = null;

  constructor(private fb: FormBuilder, private groupsService: GroupsService, private router: Router) {}

  submit(): void {
    if (this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = null;
    this.submitting = true;

    const { nombre } = this.form.getRawValue();

    this.groupsService.create(nombre).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/groups/list']);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting = false;
        this.errorMessage = err.error?.error?.message ?? 'Error al crear el grupo';
      },
    });
  }
}