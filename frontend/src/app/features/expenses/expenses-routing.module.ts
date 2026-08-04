import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { authGuard } from '../../core/auth/auth.guard';
import { ExpenseListComponent } from './expense-list/expense-list.component';
import { BalanceViewComponent } from './balance-view/balance-view.component';

const routes: Routes = [
  { path: 'groups/:groupId/expenses', component: ExpenseListComponent, canActivate: [authGuard] },
  { path: 'groups/:groupId/balances', component: BalanceViewComponent, canActivate: [authGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ExpensesRoutingModule {}
