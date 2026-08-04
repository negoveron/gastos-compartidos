import { centsToDisplay, displayToCents } from './expenses.models';

describe('Expense Models - Money Conversion Utilities', () => {
  describe('centsToDisplay()', () => {
    it('converts whole euro amounts correctly', () => {
      expect(centsToDisplay(1000)).toBe('10.00');
      expect(centsToDisplay(500)).toBe('5.00');
      expect(centsToDisplay(0)).toBe('0.00');
    });

    it('converts amounts with cents correctly', () => {
      expect(centsToDisplay(1234)).toBe('12.34');
      expect(centsToDisplay(99)).toBe('0.99');
      expect(centsToDisplay(101)).toBe('1.01');
    });

    it('handles large amounts', () => {
      expect(centsToDisplay(1000000)).toBe('10000.00');
    });
  });

  describe('displayToCents()', () => {
    it('converts whole euro strings correctly', () => {
      expect(displayToCents('10')).toBe(1000);
      expect(displayToCents('5')).toBe(500);
      expect(displayToCents('0')).toBe(0);
    });

    it('converts strings with one decimal place correctly', () => {
      expect(displayToCents('12.3')).toBe(1230);
      expect(displayToCents('0.5')).toBe(50);
    });

    it('converts strings with two decimal places correctly', () => {
      expect(displayToCents('12.34')).toBe(1234);
      expect(displayToCents('0.99')).toBe(99);
      expect(displayToCents('1.01')).toBe(101);
    });

    it('throws on invalid formats', () => {
      expect(() => displayToCents('12.345')).toThrowError(/Invalid amount format/);
      expect(() => displayToCents('abc')).toThrowError(/Invalid amount format/);
      expect(() => displayToCents('-10')).toThrowError(/Invalid amount format/);
      expect(() => displayToCents('10.')).toThrowError(/Invalid amount format/);
      expect(() => displayToCents('.50')).toThrowError(/Invalid amount format/);
      expect(() => displayToCents('')).toThrowError(/Invalid amount format/);
    });
  });

  describe('round-trip conversion', () => {
    it('preserves values when converting cents -> display -> cents', () => {
      const testValues = [0, 1, 99, 100, 101, 1234, 5000, 99999, 1000000];
      for (const cents of testValues) {
        const display = centsToDisplay(cents);
        const backToCents = displayToCents(display);
        expect(backToCents).toBe(cents);
      }
    });

    it('preserves values when converting display -> cents -> display (normalized to 2 decimals)', () => {
      // centsToDisplay always returns 2 decimal places, so round-trip normalizes input
      const testCases = [
        { input: '0', expected: '0.00' },
        { input: '0.01', expected: '0.01' },
        { input: '0.10', expected: '0.10' },
        { input: '1', expected: '1.00' },
        { input: '1.00', expected: '1.00' },
        { input: '1.50', expected: '1.50' },
        { input: '12.34', expected: '12.34' },
        { input: '100.00', expected: '100.00' },
        { input: '999.99', expected: '999.99' },
      ];
      for (const { input, expected } of testCases) {
        const cents = displayToCents(input);
        const backToDisplay = centsToDisplay(cents);
        expect(backToDisplay).toBe(expected);
      }
    });
  });
});