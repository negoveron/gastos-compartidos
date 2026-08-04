import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';

import { BalanceDetail, BalanceBreakdownItem } from '../../../core/expenses/expenses.models';
import { ExpenseService } from '../../../core/expenses/expense.service';
import { GroupsService } from '../../../core/groups/groups.service';
import { GroupMember } from '../../../core/groups/groups.models';
import { SettlementService } from '../../../core/expenses/settlement.service';

@Component({
  selector: 'app-balance-view',
  templateUrl: './balance-view.component.html',
  styleUrls: ['./balance-view.component.scss'],
})
export class BalanceViewComponent implements OnInit {
  groupId!: number;
  groupName = '';
  isOwner = false;

  balances$: Observable<BalanceDetail[]> = of([]);
  displayedColumns: string[] = ['debtor', 'creditor', 'total', 'actions'];

  // Expandable row state
  expandedBalanceId: string | null = null;

  // Settlement modal state
  settleModalOpen = false;
  settleSubmitting = false;
  settleError: string | null = null;
  selectedDebtorId: number | null = null;
  selectedCreditorId: number | null = null;
  selectedTotalCents = 0;
  settleAmount = '';

  // Members for name lookup
  members: GroupMember[] = [];
  loadingMembers = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private expenseService: ExpenseService,
    private groupsService: GroupsService,
    private settlementService: SettlementService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('groupId');
      if (id) {
        this.groupId = +id;
        this.loadBalances();
        this.loadGroupInfo();
        this.loadMembers();
      }
    });
  }

  loadBalances(): void {
    this.balances$ = this.expenseService.getBalances(this.groupId);
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

  getMemberName(userId: number): string {
    const member = this.members.find((m) => m.userId === userId);
    return member?.nombre || member?.email || `Usuario ${userId}`;
  }

  formatAmount(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  toggleExpand(balance: BalanceDetail): void {
    const id = `${balance.debtorId}-${balance.creditorId}`;
    this.expandedBalanceId = this.expandedBalanceId === id ? null : id;
  }

  isExpanded(balance: BalanceDetail): boolean {
    const id = `${balance.debtorId}-${balance.creditorId}`;
    return this.expandedBalanceId === id;
  }

  openSettleModal(debtorId: number, creditorId: number, totalCents: number): void {
    this.selectedDebtorId = debtorId;
    this.selectedCreditorId = creditorId;
    this.selectedTotalCents = totalCents;
    this.settleAmount = '';
    this.settleError = null;
    this.settleModalOpen = true;
  }

  closeSettleModal(): void {
    this.settleModalOpen = false;
    this.settleError = null;
    this.settleAmount = '';
    this.selectedDebtorId = null;
    this.selectedCreditorId = null;
    this.selectedTotalCents = 0;
  }

  submitSettlement(): void {
    if (!this.settleAmount || this.selectedDebtorId === null || this.selectedCreditorId === null) {
      this.settleError = 'El monto es requerido';
      return;
    }

    const amountCents = Math.round(parseFloat(this.settleAmount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      this.settleError = 'El monto debe ser mayor a 0';
      return;
    }

    if (amountCents > this.selectedTotalCents) {
      this.settleError = `El monto no puede exceder la deuda de $${this.formatAmount(this.selectedTotalCents)}`;
      return;
    }

    this.settleSubmitting = true;
    this.settleError = null;

    this.settlementService
      .createSettlement(this.groupId, {
        payeeId: this.selectedCreditorId,
        amountCents,
      })
      .subscribe({
        next: () => {
          this.settleSubmitting = false;
          this.closeSettleModal();
          this.loadBalances(); // Refresh balances
        },
        error: (err) => {
          this.settleSubmitting = false;
          this.settleError = err.error?.error?.message ?? 'Error al registrar el pago';
        },
      });
  }

  navigateToExpenses(): void {
    this.router.navigate(['/groups', this.groupId, 'expenses']);
  }

  trackByBalance(index: number, balance: BalanceDetail): string {
    return `${balance.debtorId}-${balance.creditorId}`;
  }

  isExpandedRow = (index: number, balance: BalanceDetail): boolean => {
    return this.isExpanded(balance);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
