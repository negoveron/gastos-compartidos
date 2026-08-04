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
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterTestingModule } from '@angular/router/testing';
import { Component } from '@angular/core';
import { of, throwError } from 'rxjs';

import { ExpenseService } from '../../../core/expenses/expense.service';
import { GroupsService } from '../../../core/groups/groups.service';
import { SettlementService } from '../../../core/expenses/settlement.service';
import { BalanceDetail, BalanceBreakdownItem } from '../../../core/expenses/expenses.models';
import { GroupMember } from '../../../core/groups/groups.models';
import { BalanceViewComponent } from './balance-view.component';

// Stub components for router routes
@Component({ template: '' })
class StubExpenseListComponent { }

describe('BalanceViewComponent', () => {
  let component: BalanceViewComponent;
  let fixture: ComponentFixture<BalanceViewComponent>;
  let expenseService: jasmine.SpyObj<ExpenseService>;
  let groupsService: jasmine.SpyObj<GroupsService>;
  let settlementService: jasmine.SpyObj<SettlementService>;
  let router: Router;

  const mockBalances: BalanceDetail[] = [
    {
      debtorId: 2,
      creditorId: 1,
      totalCents: 1500,
      breakdown: [
        {
          expenseId: 1,
          description: 'Cena grupal',
          amountCents: 1000,
          createdAt: '2024-01-15T20:30:00.000Z',
        },
        {
          expenseId: 2,
          description: 'Desayuno',
          amountCents: 500,
          createdAt: '2024-01-16T08:00:00.000Z',
        },
      ],
    },
    {
      debtorId: 3,
      creditorId: 1,
      totalCents: 500,
      breakdown: [
        {
          expenseId: 1,
          description: 'Cena grupal',
          amountCents: 500,
          createdAt: '2024-01-15T20:30:00.000Z',
        },
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

  const mockSettlementResponse = {
    id: 1,
    groupId: 1,
    payerId: 2,
    payeeId: 1,
    amountCents: 1000,
    createdAt: '2024-01-16T12:00:00.000Z',
  };

  beforeEach(waitForAsync(() => {
    const expenseSpy = jasmine.createSpyObj('ExpenseService', ['getBalances']);
    const groupsSpy = jasmine.createSpyObj('GroupsService', ['getAll', 'getMembers']);
    const settlementSpy = jasmine.createSpyObj('SettlementService', ['createSettlement']);

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
        MatTableModule,
        MatIconModule,
        MatDialogModule,
        MatTooltipModule,
        RouterTestingModule.withRoutes([
          { path: 'groups/:groupId/expenses', component: StubExpenseListComponent },
        ]),
      ],
      declarations: [BalanceViewComponent, StubExpenseListComponent],
      providers: [
        { provide: ExpenseService, useValue: expenseSpy },
        { provide: GroupsService, useValue: groupsSpy },
        { provide: SettlementService, useValue: settlementSpy },
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
    settlementService = TestBed.inject(SettlementService) as jasmine.SpyObj<SettlementService>;
    router = TestBed.inject(Router);

    expenseService.getBalances.and.returnValue(of(mockBalances));
    groupsService.getAll.and.returnValue(of(mockGroups));
    groupsService.getMembers.and.returnValue(of(mockMembers));
    settlementService.createSettlement.and.returnValue(of(mockSettlementResponse));
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BalanceViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have correct displayed columns', () => {
    expect(component.displayedColumns).toEqual(['debtor', 'creditor', 'total', 'actions']);
  });

  it('should load balances on init', () => {
    expect(expenseService.getBalances).toHaveBeenCalledWith(1);
  });

  it('should load group info and set groupName', () => {
    expect(groupsService.getAll).toHaveBeenCalled();
    expect(component.groupName).toBe('Grupo Test');
    expect(component.isOwner).toBe(true);
  });

  it('should load members for name lookup', () => {
    expect(groupsService.getMembers).toHaveBeenCalledWith(1);
    expect(component.members).toEqual(mockMembers);
  });

  it('should get member name correctly', () => {
    expect(component.getMemberName(1)).toBe('Owner');
    expect(component.getMemberName(2)).toBe('Member');
    expect(component.getMemberName(999)).toBe('Usuario 999');
  });

  it('should format amount correctly', () => {
    expect(component.formatAmount(1500)).toBe('15.00');
    expect(component.formatAmount(1234)).toBe('12.34');
    expect(component.formatAmount(50)).toBe('0.50');
  });

  it('should toggle expand on balance row', () => {
    const balance = mockBalances[0];
    expect(component.isExpanded(balance)).toBe(false);

    component.toggleExpand(balance);
    expect(component.isExpanded(balance)).toBe(true);

    component.toggleExpand(balance);
    expect(component.isExpanded(balance)).toBe(false);
  });

  it('should open settle modal with correct data', () => {
    component.openSettleModal(2, 1, 1500);

    expect(component.settleModalOpen).toBe(true);
    expect(component.selectedDebtorId).toBe(2);
    expect(component.selectedCreditorId).toBe(1);
    expect(component.selectedTotalCents).toBe(1500);
    expect(component.settleError).toBeNull();
  });

  it('should close settle modal and reset state', () => {
    component.settleModalOpen = true;
    component.selectedDebtorId = 2;
    component.selectedCreditorId = 1;
    component.selectedTotalCents = 1500;
    component.settleAmount = '10.00';
    component.settleError = 'Some error';

    component.closeSettleModal();

    expect(component.settleModalOpen).toBe(false);
    expect(component.selectedDebtorId).toBeNull();
    expect(component.selectedCreditorId).toBeNull();
    expect(component.selectedTotalCents).toBe(0);
    expect(component.settleAmount).toBe('');
    expect(component.settleError).toBeNull();
  });

  it('should not submit settlement if amount is empty', () => {
    component.selectedDebtorId = 2;
    component.selectedCreditorId = 1;
    component.selectedTotalCents = 1500;
    component.settleAmount = '';

    component.submitSettlement();

    expect(settlementService.createSettlement).not.toHaveBeenCalled();
    expect(component.settleError).toBe('El monto es requerido');
  });

  it('should not submit settlement if amount is invalid', () => {
    component.selectedDebtorId = 2;
    component.selectedCreditorId = 1;
    component.selectedTotalCents = 1500;
    component.settleAmount = '0';

    component.submitSettlement();

    expect(settlementService.createSettlement).not.toHaveBeenCalled();
    expect(component.settleError).toBe('El monto debe ser mayor a 0');
  });

  it('should not submit settlement if amount exceeds debt', () => {
    component.selectedDebtorId = 2;
    component.selectedCreditorId = 1;
    component.selectedTotalCents = 1500;
    component.settleAmount = '20.00';

    component.submitSettlement();

    expect(settlementService.createSettlement).not.toHaveBeenCalled();
    expect(component.settleError).toBe('El monto no puede exceder la deuda de $15.00');
  });

  it('should submit settlement successfully', () => {
    component.selectedDebtorId = 2;
    component.selectedCreditorId = 1;
    component.selectedTotalCents = 1500;
    component.settleAmount = '10.00';

    component.submitSettlement();

    expect(settlementService.createSettlement).toHaveBeenCalledWith(1, {
      payeeId: 1,
      amountCents: 1000,
    });
    expect(component.settleSubmitting).toBe(false);
    expect(component.settleModalOpen).toBe(false);
  });

  it('should handle settlement error (e.g., overpayment)', () => {
    settlementService.createSettlement.and.returnValue(
      throwError(() => ({
        error: { error: { message: 'Overpayment not allowed' } },
      }))
    );
    component.selectedDebtorId = 2;
    component.selectedCreditorId = 1;
    component.selectedTotalCents = 1500;
    component.settleAmount = '10.00';

    component.submitSettlement();

    expect(component.settleSubmitting).toBe(false);
    expect(component.settleError).toBe('Overpayment not allowed');
  });

  it('should refresh balances after successful settlement', () => {
    component.selectedDebtorId = 2;
    component.selectedCreditorId = 1;
    component.selectedTotalCents = 1500;
    component.settleAmount = '10.00';

    component.submitSettlement();

    expect(expenseService.getBalances).toHaveBeenCalledTimes(2); // Initial load + refresh
  });

  it('should navigate to expenses view', () => {
    spyOn(router, 'navigate');
    component.groupId = 1;
    component.navigateToExpenses();
    expect(router.navigate).toHaveBeenCalledWith(['/groups', 1, 'expenses']);
  });

  it('should format date correctly', () => {
    const date = component.formatDate('2024-01-15T20:30:00.000Z');
    expect(date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('should track by balance correctly', () => {
    const balance = mockBalances[0];
    const key = component.trackByBalance(0, balance);
    expect(key).toBe('2-1');
  });
});
