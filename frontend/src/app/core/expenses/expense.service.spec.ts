import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { ExpenseService } from './expense.service';
import { CreateExpensePayload, CreateExpenseResponse, BalanceDetail, Expense } from './expenses.models';

describe('ExpenseService', () => {
  let service: ExpenseService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiBaseUrl}/groups`;

  const mockExpenseResponse: CreateExpenseResponse = {
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
  };

  const mockExpenseList: Expense[] = [
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

  const mockBalancesResponse: BalanceDetail[] = [
    {
      debtorId: 2,
      creditorId: 1,
      totalCents: 1000,
      breakdown: [
        {
          expenseId: 1,
          description: 'Cena grupal',
          amountCents: 500,
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

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    service = TestBed.inject(ExpenseService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('createExpense()', () => {
    it('should POST to the correct endpoint with the payload', (done) => {
      const payload: CreateExpensePayload = {
        amountCents: 1500,
        description: 'Cena grupal',
      };

      service.createExpense(1, payload).subscribe((result) => {
        expect(result).toEqual(mockExpenseResponse);
        expect(result.id).toBe(1);
        expect(result.amountCents).toBe(1500);
        expect(result.splits.length).toBe(3);
        done();
      });

      const req = httpMock.expectOne(`${baseUrl}/1/expenses`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(mockExpenseResponse);
    });

    it('should handle different group IDs', (done) => {
      const payload: CreateExpensePayload = {
        amountCents: 2000,
        description: 'Almuerzo',
      };

      service.createExpense(42, payload).subscribe((result) => {
        expect(result).toEqual(mockExpenseResponse);
        done();
      });

      const req = httpMock.expectOne(`${baseUrl}/42/expenses`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(mockExpenseResponse);
    });

    it('should propagate HTTP errors', (done) => {
      const payload: CreateExpensePayload = {
        amountCents: 1500,
        description: 'Cena grupal',
      };

      service.createExpense(1, payload).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(400);
          done();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/1/expenses`);
      req.flush({ error: { code: 'VALIDATION_ERROR', message: 'Invalid amount' } }, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('getBalances()', () => {
    it('should GET from the correct endpoint and map response.balances', (done) => {
      service.getBalances(1).subscribe((result) => {
        expect(result).toEqual(mockBalancesResponse);
        expect(result.length).toBe(2);
        expect(result[0].debtorId).toBe(2);
        expect(result[0].creditorId).toBe(1);
        expect(result[0].totalCents).toBe(1000);
        expect(result[0].breakdown.length).toBe(2);
        done();
      });

      const req = httpMock.expectOne(`${baseUrl}/1/balances`);
      expect(req.request.method).toBe('GET');
      req.flush({ balances: mockBalancesResponse });
    });

    it('should handle different group IDs', (done) => {
      service.getBalances(99).subscribe((result) => {
        expect(result).toEqual(mockBalancesResponse);
        done();
      });

      const req = httpMock.expectOne(`${baseUrl}/99/balances`);
      expect(req.request.method).toBe('GET');
      req.flush({ balances: mockBalancesResponse });
    });

    it('should return empty array when no balances exist', (done) => {
      service.getBalances(1).subscribe((result) => {
        expect(result).toEqual([]);
        expect(result.length).toBe(0);
        done();
      });

      const req = httpMock.expectOne(`${baseUrl}/1/balances`);
      req.flush({ balances: [] });
    });

    it('should propagate HTTP errors', (done) => {
      service.getBalances(1).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(403);
          done();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/1/balances`);
      req.flush({ error: { code: 'NOT_AUTHORIZED', message: 'No access to group' } }, { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('getExpenses()', () => {
    it('should GET from the correct endpoint and map response.expenses', (done) => {
      service.getExpenses(1).subscribe((result) => {
        expect(result).toEqual(mockExpenseList);
        expect(result.length).toBe(2);
        expect(result[0].id).toBe(1);
        expect(result[0].description).toBe('Cena grupal');
        expect(result[0].amountCents).toBe(1500);
        expect(result[1].id).toBe(2);
        expect(result[1].description).toBe('Desayuno');
        done();
      });

      const req = httpMock.expectOne(`${baseUrl}/1/expenses`);
      expect(req.request.method).toBe('GET');
      req.flush({ expenses: mockExpenseList });
    });

    it('should handle different group IDs', (done) => {
      service.getExpenses(42).subscribe((result) => {
        expect(result).toEqual(mockExpenseList);
        done();
      });

      const req = httpMock.expectOne(`${baseUrl}/42/expenses`);
      expect(req.request.method).toBe('GET');
      req.flush({ expenses: mockExpenseList });
    });

    it('should return empty array when no expenses exist', (done) => {
      service.getExpenses(1).subscribe((result) => {
        expect(result).toEqual([]);
        expect(result.length).toBe(0);
        done();
      });

      const req = httpMock.expectOne(`${baseUrl}/1/expenses`);
      req.flush({ expenses: [] });
    });

    it('should propagate HTTP errors', (done) => {
      service.getExpenses(1).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(403);
          done();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/1/expenses`);
      req.flush({ error: { code: 'NOT_AUTHORIZED', message: 'No access to group' } }, { status: 403, statusText: 'Forbidden' });
    });
  });
});