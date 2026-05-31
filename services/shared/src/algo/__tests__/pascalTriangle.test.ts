import { describe, it, expect } from 'vitest';
import { pascalTriangle, binomialCoefficient } from '../pascalTriangle';

describe('pascalTriangle', () => {
  it('throws on negative rows', () => {
    expect(() => pascalTriangle(-1)).toThrow(RangeError);
  });

  it('throws on non-integer rows', () => {
    expect(() => pascalTriangle(1.5)).toThrow(RangeError);
  });

  it('rows=0 => empty', () => {
    expect(pascalTriangle(0)).toEqual([]);
  });

  it('rows=1 => [[1]]', () => {
    expect(pascalTriangle(1)).toEqual([[1n]]);
  });

  it('rows=5', () => {
    expect(pascalTriangle(5)).toEqual([
      [1n],
      [1n, 1n],
      [1n, 2n, 1n],
      [1n, 3n, 3n, 1n],
      [1n, 4n, 6n, 4n, 1n],
    ]);
  });

  it('row sum = 2^i', () => {
    const t = pascalTriangle(10);
    for (let i = 0; i < t.length; i += 1) {
      const s = t[i].reduce((a, b) => a + b, 0n);
      expect(s).toBe(1n << BigInt(i));
    }
  });

  it('rows are symmetric', () => {
    const t = pascalTriangle(8);
    for (const row of t) {
      const rev = [...row].reverse();
      expect(row).toEqual(rev);
    }
  });
});

describe('binomialCoefficient', () => {
  it('C(0,0) = 1', () => {
    expect(binomialCoefficient(0, 0)).toBe(1n);
  });

  it('C(5,0) = 1', () => {
    expect(binomialCoefficient(5, 0)).toBe(1n);
  });

  it('C(5,5) = 1', () => {
    expect(binomialCoefficient(5, 5)).toBe(1n);
  });

  it('C(5,2) = 10', () => {
    expect(binomialCoefficient(5, 2)).toBe(10n);
  });

  it('C(10,3) = 120', () => {
    expect(binomialCoefficient(10, 3)).toBe(120n);
  });

  it('C(20,10) = 184756', () => {
    expect(binomialCoefficient(20, 10)).toBe(184756n);
  });

  it('k > n => 0', () => {
    expect(binomialCoefficient(3, 5)).toBe(0n);
  });

  it('throws on negative args', () => {
    expect(() => binomialCoefficient(-1, 0)).toThrow(RangeError);
    expect(() => binomialCoefficient(5, -1)).toThrow(RangeError);
  });
});
