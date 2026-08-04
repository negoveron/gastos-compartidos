import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  CreateExpensePayload,
  CreateExpenseResponse,
  BalancesResponse,
  BalanceDetail,
  Expense,
  ExpensesResponse,
} from './expenses.models';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly baseUrl = `${environment.apiBaseUrl}/groups`;

  constructor(private http: HttpClient) {}

  /**
   * Creates a new expense in the specified group.
   * POST /groups/:id/expenses
   *
   * @param groupId - The group ID
   * @param payload - Expense data (amount in cents, description)
   * @returns Observable with the created expense including splits
   */
  createExpense(groupId: number, payload: CreateExpensePayload): Observable<CreateExpenseResponse> {
    return this.http.post<CreateExpenseResponse>(`${this.baseUrl}/${groupId}/expenses`, payload);
  }

  /**
   * Fetches all expenses for a group.
   * GET /groups/:id/expenses
   *
   * @param groupId - The group ID
   * @returns Observable with array of Expense
   */
  getExpenses(groupId: number): Observable<Expense[]> {
    return this.http.get<ExpensesResponse>(`${this.baseUrl}/${groupId}/expenses`).pipe(
      map((response) => response.expenses)
    );
  }

  /**
   * Fetches detailed balance breakdown for a group.
   * GET /groups/:id/balances
   *
   * @param groupId - The group ID
   * @returns Observable with array of BalanceDetail (debtor -> creditor debts with breakdown)
   */
  getBalances(groupId: number): Observable<BalanceDetail[]> {
    return this.http.get<BalancesResponse>(`${this.baseUrl}/${groupId}/balances`).pipe(
      map((response) => response.balances)
    );
  }
}