import { describe, it, expect } from 'vitest';
import { polynomialMultiply } from '../polynomialMultiply';

describe('polynomialMultiply', () => {
  it('(1+x)*(1+x) = 1+2x+x^2', () => {
    expect(polynomialMultiply([1, 1], [1, 1])).toEqual([1, 2, 1]);
  });

  it('(1+2x+3x^2)*(4+5x) = 4+13x+22x^2+15x^3', () => {
    expect(polynomialMultiply([1, 2, 3], [4, 5])).toEqual([4, 13, 22, 15]);
  });

  it('multiplying by 1 returns same poly (trimmed)', () => {
    expect(polynomialMultiply([3, 0, 2], [1])).toEqual([3, 0, 2]);
  });

  it('multiplying by 0 yields [0]', () => {
    expect(polynomialMultiply([1, 2, 3], [0])).toEqual([0]);
  });

  it('commutative', () => {
    const A = [1, -1, 2];
    const B = [3, 0, -2, 1];
    expect(polynomialMultiply(A, B)).toEqual(polynomialMultiply(B, A));
  });

  it('handles negatives', () => {
    expect(polynomialMultiply([1, -1], [1, 1])).toEqual([1, 0, -1]);
  });

  it('trims to highest non-zero coefficient', () => {
    const r = polynomialMultiply([1, 0, 0, 0], [1, 0, 1]);
    expect(r).toEqual([1, 0, 1]);
  });

  it('trims trailing zeros', () => {
    const r = polynomialMultiply([0, 1], [0]);
    expect(r).toEqual([0]);
  });

  it('rejects empty', () => {
    expect(() => polynomialMultiply([], [1])).toThrow();
  });

  it('rejects non-finite', () => {
    expect(() => polynomialMultiply([1, NaN], [1])).toThrow();
  });

  it('large dense multiplication', () => {
    const a = [1, 2, 3, 4, 5];
    const b = [5, 4, 3, 2, 1];
    expect(polynomialMultiply(a, b)).toEqual([5, 14, 26, 40, 55, 40, 26, 14, 5]);
  });
});
