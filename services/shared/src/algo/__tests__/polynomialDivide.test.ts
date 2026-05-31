import { describe, it, expect } from 'vitest';
import { polynomialDivide } from '../polynomialDivide';
import { polynomialMultiply } from '../polynomialMultiply';

function polyAdd(a: number[], b: number[]): number[] {
  const n = Math.max(a.length, b.length);
  const r: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) r[i] = (a[i] ?? 0) + (b[i] ?? 0);
  let k = r.length - 1;
  while (k > 0 && r[k] === 0) k--;
  return r.slice(0, k + 1);
}

describe('polynomialDivide', () => {
  it('exact division: (x^2-1) / (x-1) = (x+1)', () => {
    // x^2 - 1 = [-1, 0, 1]; x - 1 = [-1, 1]
    const { quotient, remainder } = polynomialDivide([-1, 0, 1], [-1, 1]);
    expect(quotient).toEqual([1, 1]);
    expect(remainder).toEqual([0]);
  });

  it('division with remainder', () => {
    // (x^2 + 1) / (x - 1) = x + 1 remainder 2
    const { quotient, remainder } = polynomialDivide([1, 0, 1], [-1, 1]);
    expect(quotient).toEqual([1, 1]);
    expect(remainder).toEqual([2]);
  });

  it('divisor larger than dividend yields q=0, r=dividend', () => {
    const { quotient, remainder } = polynomialDivide([1, 2], [1, 0, 1]);
    expect(quotient).toEqual([0]);
    expect(remainder).toEqual([1, 2]);
  });

  it('dividing by 1 returns same poly', () => {
    const { quotient, remainder } = polynomialDivide([3, 0, 2], [1]);
    expect(quotient).toEqual([3, 0, 2]);
    expect(remainder).toEqual([0]);
  });

  it('identity: dividend = q*divisor + r', () => {
    const dividend = [1, -2, 3, 4, -1];
    const divisor = [2, -1, 1];
    const { quotient, remainder } = polynomialDivide(dividend, divisor);
    const reconstructed = polyAdd(polynomialMultiply(quotient, divisor), remainder);
    for (let i = 0; i < dividend.length; i++) {
      expect(reconstructed[i] ?? 0).toBeCloseTo(dividend[i], 9);
    }
  });

  it('division by leading coefficient != 1', () => {
    // (2x^2 + 3x + 1) / (2x + 1) = x + 1 remainder 0
    const { quotient, remainder } = polynomialDivide([1, 3, 2], [1, 2]);
    expect(quotient[0]).toBeCloseTo(1, 9);
    expect(quotient[1]).toBeCloseTo(1, 9);
    expect(remainder).toEqual([0]);
  });

  it('handles negative coefficients', () => {
    const { quotient, remainder } = polynomialDivide([-1, 0, 1], [1, 1]);
    // (x^2 - 1) / (x + 1) = x - 1
    expect(quotient).toEqual([-1, 1]);
    expect(remainder).toEqual([0]);
  });

  it('rejects empty inputs', () => {
    expect(() => polynomialDivide([], [1])).toThrow();
    expect(() => polynomialDivide([1], [])).toThrow();
  });

  it('rejects zero divisor', () => {
    expect(() => polynomialDivide([1, 2], [0])).toThrow(/zero/);
  });

  it('rejects non-finite', () => {
    expect(() => polynomialDivide([1, Infinity], [1, 1])).toThrow();
  });

  it('quotient and remainder trimmed', () => {
    const { quotient, remainder } = polynomialDivide([0, 0, 1], [0, 1]);
    // x^2 / x = x remainder 0
    expect(quotient).toEqual([0, 1]);
    expect(remainder).toEqual([0]);
  });
});
