import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { SettleModalComponent } from './settle-modal.component';
import { GroupMember } from '../../../core/groups/groups.models';

describe('SettleModalComponent', () => {
  let component: SettleModalComponent;
  let fixture: ComponentFixture<SettleModalComponent>;

  const mockMembers: GroupMember[] = [
    { userId: 1, email: 'owner@example.com', nombre: 'Owner', isOwner: true },
    { userId: 2, email: 'member@example.com', nombre: 'Member', isOwner: false },
    { userId: 3, email: 'member2@example.com', nombre: 'Member 2', isOwner: false },
  ];

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        FormsModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatDialogModule,
      ],
      declarations: [SettleModalComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SettleModalComponent);
    component = fixture.componentInstance;
    component.debtorId = 2;
    component.creditorId = 1;
    component.totalCents = 1500;
    component.members = mockMembers;
    component.isOpen = true;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should get debtor name correctly', () => {
    expect(component.getDebtorName()).toBe('Member');
  });

  it('should get creditor name correctly', () => {
    expect(component.getCreditorName()).toBe('Owner');
  });

  it('should return fallback name for unknown user', () => {
    component.debtorId = 999;
    expect(component.getDebtorName()).toBe('Usuario 999');
  });

  it('should format amount correctly', () => {
    expect(component.formatAmount(1500)).toBe('15.00');
    expect(component.formatAmount(1234)).toBe('12.34');
    expect(component.formatAmount(50)).toBe('0.50');
  });

  it('should emit close event when onClose is called', () => {
    spyOn(component.close, 'emit');
    component.onClose();
    expect(component.close.emit).toHaveBeenCalled();
  });

  it('should not submit if amount is empty', () => {
    spyOn(component.settled, 'emit');
    component.settleAmount = '';
    component.onSubmit();
    expect(component.settled.emit).not.toHaveBeenCalled();
    expect(component.errorMessage).toBe('El monto es requerido');
  });

  it('should not submit if amount is invalid', () => {
    spyOn(component.settled, 'emit');
    component.settleAmount = '0';
    component.onSubmit();
    expect(component.settled.emit).not.toHaveBeenCalled();
    expect(component.errorMessage).toBe('El monto debe ser mayor a 0');
  });

  it('should not submit if amount exceeds total debt', () => {
    spyOn(component.settled, 'emit');
    component.settleAmount = '20.00';
    component.onSubmit();
    expect(component.settled.emit).not.toHaveBeenCalled();
    expect(component.errorMessage).toBe('El monto no puede exceder la deuda de $15.00');
  });

  it('should emit settled event with correct amount on valid submit', () => {
    spyOn(component.settled, 'emit');
    component.settleAmount = '10.00';
    component.onSubmit();
    expect(component.settled.emit).toHaveBeenCalledWith({ amountCents: 1000 });
    expect(component.submitting).toBe(true);
  });

  it('should reset form and emit close on submit success', () => {
    spyOn(component.close, 'emit');
    component.settleAmount = '10.00';
    component.submitting = true;

    component.onSubmitSuccess();

    expect(component.submitting).toBe(false);
    expect(component.settleAmount).toBe('');
    expect(component.errorMessage).toBeNull();
    expect(component.close.emit).toHaveBeenCalled();
  });

  it('should set error message and stop submitting on submit error', () => {
    component.submitting = true;
    component.onSubmitError('Error del servidor');

    expect(component.submitting).toBe(false);
    expect(component.errorMessage).toBe('Error del servidor');
  });

  it('should reset form when modal opens', () => {
    component.settleAmount = '10.00';
    component.errorMessage = 'Some error';
    component.submitting = true;

    component.isOpen = true;
    component.ngOnChanges({ isOpen: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false } });

    expect(component.settleAmount).toBe('');
    expect(component.errorMessage).toBeNull();
    expect(component.submitting).toBe(false);
  });

  it('should disable submit button when submitting', () => {
    component.submitting = true;
    fixture.detectChanges();

    const submitButton = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(submitButton.disabled).toBe(true);
  });
});
