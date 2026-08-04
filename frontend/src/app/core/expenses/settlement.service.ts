import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SettleRequest, SettlementResponse } from './expenses.models';

@Injectable({ providedIn: 'root' })
export class SettlementService {
  private readonly baseUrl = `${environment.apiBaseUrl}/groups`;

  constructor(private http: HttpClient) {}

  /**
   * Records a settlement (payment) between the authenticated user (payer) and another user (payee).
   * POST /groups/:id/settlements
   *
   * @param groupId - The group ID
   * @param payload - Settlement data (payeeId, amount in cents)
   * @returns Observable with the created settlement record
   */
  createSettlement(groupId: number, payload: SettleRequest): Observable<SettlementResponse> {
    return this.http.post<SettlementResponse>(`${this.baseUrl}/${groupId}/settlements`, payload);
  }
}