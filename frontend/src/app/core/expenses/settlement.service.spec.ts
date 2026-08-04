import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { SettlementService } from './settlement.service';
import { SettleRequest, SettlementResponse } from './expenses.models';

describe('SettlementService', () => {
  let service: SettlementService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiBaseUrl}/groups`;

  const mockSettlementResponse: SettlementResponse = {
    id: 1,
    groupId: 1,
    payerId: 2,
    payeeId: 1,
    amountCents: 1000,
    createdAt: '2024-01-16T12:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    service = TestBed.inject(SettlementService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('createSettlement()', () => {
    it('should POST to the correct endpoint with the payload', (done) => {
      const payload: SettleRequest = {
        payeeId: 1,
        amountCents: 1000,
      };

      service.createSettlement(1, payload).subscribe((result) => {
        expect(result).toEqual(mockSettlementResponse);
        expect(result.id).toBe(1);
        expect(result.groupId).toBe(1);
        expect(result.payerId).toBe(2);
        expect(result.payeeId).toBe(1);
        expect(result.amountCents).toBe(1000);
        done();
      });

      const req = httpMock.expectOne(`${baseUrl}/1/settlements`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(mockSettlementResponse);
    });

    it('should handle different group IDs', (done) => {
      const payload: SettleRequest = {
        payeeId: 3,
        amountCents: 500,
      };

      service.createSettlement(42, payload).subscribe((result) => {
        expect(result).toEqual(mockSettlementResponse);
        done();
      });

      const req = httpMock.expectOne(`${baseUrl}/42/settlements`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(mockSettlementResponse);
    });

    it('should propagate HTTP errors (e.g., overpayment)', (done) => {
      const payload: SettleRequest = {
        payeeId: 1,
        amountCents: 5000,
      };

      service.createSettlement(1, payload).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.error.code).toBe('VALIDATION_ERROR');
          done();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/1/settlements`);
      req.flush(
        { error: { code: 'VALIDATION_ERROR', message: 'Overpayment not allowed', details: [{ field: 'amountCents', message: 'Overpayment not allowed: el monto excede la deuda actual' }] } },
        { status: 400, statusText: 'Bad Request' }
      );
    });

    it('should propagate HTTP errors (e.g., not authorized)', (done) => {
      const payload: SettleRequest = {
        payeeId: 1,
        amountCents: 1000,
      };

      service.createSettlement(999, payload).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(403);
          done();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/999/settlements`);
      req.flush({ error: { code: 'NOT_AUTHORIZED', message: 'No access to group' } }, { status: 403, statusText: 'Forbidden' });
    });

    it('should propagate HTTP errors (e.g., payee not member)', (done) => {
      const payload: SettleRequest = {
        payeeId: 999,
        amountCents: 1000,
      };

      service.createSettlement(1, payload).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.error.code).toBe('VALIDATION_ERROR');
          done();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/1/settlements`);
      req.flush(
        { error: { code: 'VALIDATION_ERROR', message: 'El beneficiario no es miembro del grupo', details: [{ field: 'payeeId', message: 'El beneficiario no es miembro del grupo' }] } },
        { status: 400, statusText: 'Bad Request' }
      );
    });
  });
});