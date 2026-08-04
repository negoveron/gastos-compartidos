import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterTestingModule } from '@angular/router/testing';
import { Component } from '@angular/core';
import { of, throwError } from 'rxjs';

import { ExpenseService } from '../../../core/expenses/expense.service';
import { GroupsService } from '../../../core/groups/groups.service';
import { Expense } from '../../../core/expenses/expenses.models';
import { GroupMember } from '../../../core/groups/groups.models';
import { ExpenseListComponent } from './expense-list.component';
import { ExpenseAddModalComponent } from '../expense-add-modal/expense-add-modal.component';

// Stub components for router routes
@Component({ template: '' })
class StubBalanceViewComponent { }

describe('ExpenseListComponent', () => {
  let component: ExpenseListComponent;
  let fixture: ComponentFixture<ExpenseListComponent>;
  let expenseService: jasmine.SpyObj<ExpenseService>;
  let groupsService: jasmine.SpyObj<GroupsService>;
  let router: Router;

  const mockExpenses: Expense[] = [
    {
      id: 1,
      groupId: 1,
      payerId: 1,
      amountCents: 1500,
      description: 'Cena grupal',
      createdAt: '2024-01-15T20:30:00.000Z',
      splits: [
        { userId: 1, amountCents: 500 },
        { userId: 2, amountCents: 500 },
        { userId: 3, amountCents: 500 },
      ],
    },
    {
      id: 2,
      groupId: 1,
      payerId: 2,
      amountCents: 1000,
      description: 'Desayuno',
      createdAt: '2024-01-16T08:00:00.000Z',
      splits: [
        { userId: 1, amountCents: 334 },
        { userId: 2, amountCents: 333 },
        { userId: 3, amountCents: 333 },
      ],
    },
  ];

  const mockMembers: GroupMember[] = [
    { userId: 1, email: 'owner@example.com', nombre: 'Owner', isOwner: true },
    { userId: 2, email: 'member@example.com', nombre: 'Member', isOwner: false },
    { userId: 3, email: 'member2@example.com', nombre: 'Member 2', isOwner: false },
  ];

  const mockGroups = [
    { id: 1, nombre: 'Grupo Test', ownerId: 1, isOwner: true },
    { id: 2, nombre: 'Otro Grupo', ownerId: 2, isOwner: false },
  ];

  beforeEach(waitForAsync(() => {
    const expenseSpy = jasmine.createSpyObj('ExpenseService', ['createExpense', 'getExpenses']);
    const groupsSpy = jasmine.createSpyObj('GroupsService', ['getAll', 'getMembers']);

    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        NoopAnimationsModule,
        FormsModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatSelectModule,
        MatTableModule,
        MatIconModule,
        MatDialogModule,
        MatTooltipModule,
        RouterTestingModule.withRoutes([
          { path: 'groups/:groupId/balances', component: StubBalanceViewComponent },
        ]),
      ],
      declarations: [ExpenseListComponent, ExpenseAddModalComponent, StubBalanceViewComponent],
      providers: [
        { provide: ExpenseService, useValue: expenseSpy },
        { provide: GroupsService, useValue: groupsSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({ get: (key: string) => (key === 'groupId' ? '1' : null) }),
          },
        },
      ],
    }).compileComponents();

    expenseService = TestBed.inject(ExpenseService) as jasmine.SpyObj<ExpenseService>;
    groupsService = TestBed.inject(GroupsService) as jasmine.SpyObj<GroupsService>;
    router = TestBed.inject(Router);

    expenseService.getExpenses.and.returnValue(of(mockExpenses));
    expenseService.createExpense.and.returnValue(of(mockExpenses[0]));
    groupsService.getAll.and.returnValue(of(mockGroups));
    groupsService.getMembers.and.returnValue(of(mockMembers));
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExpenseListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have correct displayed columns', () => {
    expect(component.displayedColumns).toEqual(['description', 'amount', 'payer', 'date', 'actions']);
  });

  it('should load expenses on init', () => {
    expect(expenseService.getExpenses).toHaveBeenCalledWith(1);
  });

  it('should load group info and set groupName', () => {
    expect(groupsService.getAll).toHaveBeenCalled();
    expect(component.groupName).toBe('Grupo Test');
    expect(component.isOwner).toBe(true);
  });

  it('should load members for payer selector', () => {
    expect(groupsService.getMembers).toHaveBeenCalledWith(1);
    expect(component.members).toEqual(mockMembers);
  });

  it('should open add modal', () => {
    component.openAddModal();
    expect(component.addModalOpen).toBe(true);
  });

  it('should close add modal', () => {
    component.addModalOpen = true;
    component.closeAddModal();
    expect(component.addModalOpen).toBe(false);
  });

  it('should call expense service on expense submitted', () => {
    const payload = { amountCents: 1550, description: 'Nuevo gasto' };
    component.onExpenseSubmitted(payload);

    expect(expenseService.createExpense).toHaveBeenCalledWith(1, payload);
  });

  it('should close modal and refresh expenses on successful submit', () => {
    component.addModalOpen = true;
    const payload = { amountCents: 1550, description: 'Nuevo gasto' };

    component.onExpenseSubmitted(payload);

    expect(component.addModalOpen).toBe(false);
    expect(expenseService.getExpenses).toHaveBeenCalledTimes(2); // Initial load + refresh
  });

  it('should handle create expense error', () => {
    expenseService.createExpense.and.returnValue(
      throwError(() => ({
        error: { error: { message: 'Error del servidor' } },
      }))
    );
    component.addModalOpen = true;
    const payload = { amountCents: 1550, description: 'Nuevo gasto' };

    component.onExpenseSubmitted(payload);

    // The modal component handles its own error state via onSubmitError
    // We just verify the service was called
    expect(expenseService.createExpense).toHaveBeenCalled();
  });

  it('should format amount correctly', () => {
    expect(component.formatAmount(1500)).toBe('15.00');
    expect(component.formatAmount(1234)).toBe('12.34');
    expect(component.formatAmount(50)).toBe('0.50');
  });

  it('should get payer name from members', () => {
    component.members = mockMembers;
    expect(component.getPayerName(1)).toBe('Owner');
    expect(component.getPayerName(2)).toBe('Member');
    expect(component.getPayerName(999)).toBe('Usuario 999');
  });

  it('should navigate to balances view', () => {
    spyOn(router, 'navigate');
    component.groupId = 1;
    component.navigateToBalances();
    expect(router.navigate).toHaveBeenCalledWith(['/groups', 1, 'balances']);
  });
});
