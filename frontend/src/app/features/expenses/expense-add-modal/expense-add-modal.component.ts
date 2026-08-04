import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { GroupMember } from '../../../core/groups/groups.models';
import { CreateExpensePayload } from '../../../core/expenses/expenses.models';

@Component({
  selector: 'app-expense-add-modal',
  templateUrl: './expense-add-modal.component.html',
  styleUrls: ['./expense-add-modal.component.scss'],
})
export class ExpenseAddModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() groupId!: number;
  @Input() members: GroupMember[] = [];
  @Input() loadingMembers = false;

  @Output() close = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<CreateExpensePayload>();

  readonly form: FormGroup = this.fb.group({
    description: ['', [Validators.required, Validators.maxLength(200)]],
    amount: ['', [Validators.required, Validators.min(0.01)]],
    payerId: [null, [Validators.required]],
  });

  submitting = false;
  errorMessage: string | null = null;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    // Set default payer to first member if available
    if (this.members.length > 0 && !this.form.get('payerId')?.value) {
      this.form.patchValue({ payerId: this.members[0].userId });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.errorMessage = null;
      this.form.reset();
      if (this.members.length > 0) {
        this.form.patchValue({ payerId: this.members[0].userId });
      }
    }
    if (changes['members'] && this.members.length > 0 && !this.form.get('payerId')?.value) {
      this.form.patchValue({ payerId: this.members[0].userId });
    }
  }

  onClose(): void {
    this.close.emit();
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = null;
    this.submitting = true;

    const { description, amount, payerId } = this.form.getRawValue();
    const payload: CreateExpensePayload = {
      amountCents: Math.round(amount * 100),
      description: description.trim(),
    };

    // The parent component will handle the actual API call
    this.submitted.emit(payload);
  }

  onSubmitSuccess(): void {
    this.submitting = false;
    this.form.reset();
    if (this.members.length > 0) {
      this.form.patchValue({ payerId: this.members[0].userId });
    }
    this.close.emit();
  }

  onSubmitError(error: string): void {
    this.submitting = false;
    this.errorMessage = error;
  }
}
