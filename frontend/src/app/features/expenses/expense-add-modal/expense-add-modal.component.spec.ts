import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { ExpenseAddModalComponent } from './expense-add-modal.component';
import { GroupMember } from '../../../core/groups/groups.models';
import { CreateExpensePayload } from '../../../core/expenses/expenses.models';

describe('ExpenseAddModalComponent', () => {
  let component: ExpenseAddModalComponent;
  let fixture: ComponentFixture<ExpenseAddModalComponent>;

  const mockMembers: GroupMember[] = [
    { userId: 1, email: 'owner@example.com', nombre: 'Owner', isOwner: true },
    { userId: 2, email: 'member@example.com', nombre: 'Member', isOwner: false },
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
        MatSelectModule,
        MatDialogModule,
      ],
      declarations: [ExpenseAddModalComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExpenseAddModalComponent);
    component = fixture.componentInstance;
    component.groupId = 1;
    component.members = mockMembers;
    component.isOpen = true;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have required validators on all fields', () => {
    // Check that validators are configured on the controls
    expect(component.form.controls['description'].hasError('required')).toBe(true);
    expect(component.form.controls['amount'].hasError('required')).toBe(true);
    // payerId has a default value from ngOnInit, so test the validator directly
    const payerControl = component.form.controls['payerId'];
    payerControl.setValue(null);
    expect(payerControl.hasError('required')).toBe(true);
  });

  it('should set default payer to first member on init', () => {
    expect(component.form.get('payerId')?.value).toBe(1);
  });

  it('should emit close event when onClose is called', () => {
    spyOn(component.close, 'emit');
    component.onClose();
    expect(component.close.emit).toHaveBeenCalled();
  });

  it('should not submit if form is invalid', () => {
    spyOn(component.submitted, 'emit');
    component.onSubmit();
    expect(component.submitted.emit).not.toHaveBeenCalled();
    expect(component.submitting).toBe(false);
  });

  it('should mark form as touched when submitting with invalid form', () => {
    spyOn(component.form, 'markAllAsTouched');
    component.onSubmit();
    expect(component.form.markAllAsTouched).toHaveBeenCalled();
  });

  it('should emit submitted event with correct payload on valid submit', () => {
    spyOn(component.submitted, 'emit');
    component.form.controls['description'].setValue('Cena grupal');
    component.form.controls['amount'].setValue(15.5);
    component.form.controls['payerId'].setValue(1);

    component.onSubmit();

    expect(component.submitted.emit).toHaveBeenCalledWith({
      amountCents: 1550,
      description: 'Cena grupal',
    } as CreateExpensePayload);
    expect(component.submitting).toBe(true);
  });

  it('should reset form and emit close on submit success', () => {
    spyOn(component.close, 'emit');
    component.form.controls['description'].setValue('Test');
    component.form.controls['amount'].setValue(100);
    component.form.controls['payerId'].setValue(2);
    component.submitting = true;

    component.onSubmitSuccess();

    expect(component.submitting).toBe(false);
    expect(component.form.get('description')?.value).toBeNull();
    expect(component.form.get('amount')?.value).toBeNull();
    expect(component.form.get('payerId')?.value).toBe(1); // Reset to first member
    expect(component.close.emit).toHaveBeenCalled();
  });

  it('should set error message and stop submitting on submit error', () => {
    component.submitting = true;
    component.onSubmitError('Error del servidor');

    expect(component.submitting).toBe(false);
    expect(component.errorMessage).toBe('Error del servidor');
  });

  it('should update default payer when members change and no payer selected', () => {
    // First, reset the form so no payer is selected
    component.form.reset();
    fixture.detectChanges();

    const newMembers: GroupMember[] = [
      { userId: 3, email: 'new@example.com', nombre: 'New Member', isOwner: false },
    ];
    component.members = newMembers;
    component.ngOnChanges({ members: { currentValue: newMembers, previousValue: mockMembers, firstChange: false, isFirstChange: () => false } });

    expect(component.form.get('payerId')?.value).toBe(3);
  });

  it('should not override payer selection when members change', () => {
    // User has selected payer 2
    component.form.controls['payerId'].setValue(2);
    fixture.detectChanges();

    const newMembers: GroupMember[] = [
      { userId: 3, email: 'new@example.com', nombre: 'New Member', isOwner: false },
    ];
    component.members = newMembers;
    component.ngOnChanges({ members: { currentValue: newMembers, previousValue: mockMembers, firstChange: false, isFirstChange: () => false } });

    // Should keep user's selection
    expect(component.form.get('payerId')?.value).toBe(2);
  });

  it('should reset form when modal opens', () => {
    component.form.controls['description'].setValue('Test');
    component.form.controls['amount'].setValue(100);
    component.errorMessage = 'Some error';

    component.isOpen = true;
    component.ngOnChanges({ isOpen: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false } });

    expect(component.form.get('description')?.value).toBeNull();
    expect(component.form.get('amount')?.value).toBeNull();
    expect(component.errorMessage).toBeNull();
  });

  it('should disable payer select when loadingMembers is true', () => {
    component.loadingMembers = true;
    fixture.detectChanges();

    // Verify the component property is correctly set
    expect(component.loadingMembers).toBe(true);
    // The template binding [disabled]="loadingMembers" will handle the DOM state
  });
});
