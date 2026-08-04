import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';

import { GroupMember } from '../../../core/groups/groups.models';

@Component({
  selector: 'app-settle-modal',
  templateUrl: './settle-modal.component.html',
  styleUrls: ['./settle-modal.component.scss'],
})
export class SettleModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() debtorId: number | null = null;
  @Input() creditorId: number | null = null;
  @Input() totalCents = 0;
  @Input() members: GroupMember[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() settled = new EventEmitter<{ amountCents: number }>();

  settleAmount = '';
  submitting = false;
  errorMessage: string | null = null;

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.resetForm();
    }
  }

  private resetForm(): void {
    this.settleAmount = '';
    this.errorMessage = null;
    this.submitting = false;
  }

  getDebtorName(): string {
    if (!this.debtorId) return '';
    const member = this.members.find((m) => m.userId === this.debtorId);
    return member?.nombre || member?.email || `Usuario ${this.debtorId}`;
  }

  getCreditorName(): string {
    if (!this.creditorId) return '';
    const member = this.members.find((m) => m.userId === this.creditorId);
    return member?.nombre || member?.email || `Usuario ${this.creditorId}`;
  }

  formatAmount(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  onClose(): void {
    this.close.emit();
  }

  onSubmit(): void {
    if (!this.settleAmount || this.debtorId === null || this.creditorId === null) {
      this.errorMessage = 'El monto es requerido';
      return;
    }

    const amountCents = Math.round(parseFloat(this.settleAmount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      this.errorMessage = 'El monto debe ser mayor a 0';
      return;
    }

    if (amountCents > this.totalCents) {
      this.errorMessage = `El monto no puede exceder la deuda de $${this.formatAmount(this.totalCents)}`;
      return;
    }

    this.submitting = true;
    this.errorMessage = null;
    this.settled.emit({ amountCents });
  }

  onSubmitSuccess(): void {
    this.resetForm();
    this.close.emit();
  }

  onSubmitError(error: string): void {
    this.submitting = false;
    this.errorMessage = error;
  }
}
