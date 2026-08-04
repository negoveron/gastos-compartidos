import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';

import { Expense, CreateExpensePayload } from '../../../core/expenses/expenses.models';
import { ExpenseService } from '../../../core/expenses/expense.service';
import { GroupsService } from '../../../core/groups/groups.service';
import { GroupMember } from '../../../core/groups/groups.models';

@Component({
  selector: 'app-expense-list',
  templateUrl: './expense-list.component.html',
  styleUrls: ['./expense-list.component.scss'],
})
export class ExpenseListComponent implements OnInit {
  groupId!: number;
  groupName = '';
  isOwner = false;

  expenses$: Observable<Expense[]> = of([]);
  displayedColumns: string[] = ['description', 'amount', 'payer', 'date', 'actions'];

  // Modal state
  addModalOpen = false;

  // Members for payer selector
  members: GroupMember[] = [];
  loadingMembers = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private expenseService: ExpenseService,
    private groupsService: GroupsService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('groupId');
      if (id) {
        this.groupId = +id;
        this.loadExpenses();
        this.loadGroupInfo();
        this.loadMembers();
      }
    });
  }

  loadExpenses(): void {
    this.expenses$ = this.expenseService.getExpenses(this.groupId);
  }

  loadGroupInfo(): void {
    this.groupsService.getAll().subscribe({
      next: (groups) => {
        const group = groups.find((g) => g.id === this.groupId);
        if (group) {
          this.groupName = group.nombre;
          this.isOwner = group.isOwner ?? false;
        }
      },
    });
  }

  loadMembers(): void {
    this.loadingMembers = true;
    this.groupsService.getMembers(this.groupId).subscribe({
      next: (members) => {
        this.members = members;
        this.loadingMembers = false;
      },
      error: () => {
        this.loadingMembers = false;
      },
    });
  }

  openAddModal(): void {
    this.addModalOpen = true;
  }

  closeAddModal(): void {
    this.addModalOpen = false;
  }

  onExpenseSubmitted(payload: CreateExpensePayload): void {
    this.expenseService.createExpense(this.groupId, payload).subscribe({
      next: () => {
        this.closeAddModal();
        this.loadExpenses(); // Refresh the list
      },
      error: (err) => {
        // The modal component will handle the error display via its onSubmitError
        // We need to pass the error back to the modal
        const modalComponent = document.querySelector('app-expense-add-modal') as any;
        if (modalComponent && modalComponent.onSubmitError) {
          modalComponent.onSubmitError(err.error?.error?.message ?? 'Error al crear el gasto');
        }
      },
    });
  }

  onExpenseSubmitError(error: string): void {
    // This will be called by the modal if there's an error
    // The modal handles its own error state
  }

  getPayerName(payerId: number): string {
    const member = this.members.find((m) => m.userId === payerId);
    return member?.nombre || member?.email || `Usuario ${payerId}`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  formatAmount(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  navigateToBalances(): void {
    this.router.navigate(['/groups', this.groupId, 'balances']);
  }
}
