import { describe, it, expect } from 'vitest';
import { legendreSymbol } from '../legendreSymbol';

describe('legendreSymbol', () => {
  it('rejects p < 3', () => {
    expect(() => legendreSymbol(1, 2)).toThrow();
  });

  it('rejects even p', () => {
    expect(() => legendreSymbol(1, 8)).toThrow();
  });

  it('rejects composite p', () => {
    expect(() => legendreSymbol(1, 15)).toThrow();
  });

  it('a divisible by p => 0', () => {
    expect(legendreSymbol(0, 7)).toBe(0);
    expect(legendreSymbol(14, 7)).toBe(0);
  });

  it('quadratic residues mod 7 => 1', () => {
    // residues mod 7: 1, 2, 4
    expect(legendreSymbol(1, 7)).toBe(1);
    expect(legendreSymbol(2, 7)).toBe(1);
    expect(legendreSymbol(4, 7)).toBe(1);
  });

  it('non-residues mod 7 => -1', () => {
    // non-residues mod 7: 3, 5, 6
    expect(legendreSymbol(3, 7)).toBe(-1);
    expect(legendreSymbol(5, 7)).toBe(-1);
    expect(legendreSymbol(6, 7)).toBe(-1);
  });

  it('mod 11 residues', () => {
    // residues: 1, 3, 4, 5, 9
    expect(legendreSymbol(1, 11)).toBe(1);
    expect(legendreSymbol(3, 11)).toBe(1);
    expect(legendreSymbol(4, 11)).toBe(1);
    expect(legendreSymbol(5, 11)).toBe(1);
    expect(legendreSymbol(9, 11)).toBe(1);
  });

  it('mod 11 non-residues', () => {
    expect(legendreSymbol(2, 11)).toBe(-1);
    expect(legendreSymbol(6, 11)).toBe(-1);
    expect(legendreSymbol(7, 11)).toBe(-1);
    expect(legendreSymbol(8, 11)).toBe(-1);
    expect(legendreSymbol(10, 11)).toBe(-1);
  });

  it('handles negative a', () => {
    // (-1/p) = 1 iff p ≡ 1 (mod 4)
    expect(legendreSymbol(-1, 5)).toBe(1);
    expect(legendreSymbol(-1, 7)).toBe(-1);
    expect(legendreSymbol(-1, 13)).toBe(1);
  });

  it('bigint inputs', () => {
    expect(legendreSymbol(2n, 7n)).toBe(1);
    expect(legendreSymbol(3n, 7n)).toBe(-1);
  });

  it('larger prime 23', () => {
    // residues mod 23: 1,2,3,4,6,8,9,12,13,16,18
    const residues = new Set([1, 2, 3, 4, 6, 8, 9, 12, 13, 16, 18]);
    for (let a = 1; a < 23; a++) {
      expect(legendreSymbol(a, 23)).toBe(residues.has(a) ? 1 : -1);
    }
  });

  it('Euler criterion consistency', () => {
    // a^((p-1)/2) ≡ legendre (mod p)
    const p = 13;
    for (let a = 1; a < p; a++) {
      const sym = legendreSymbol(a, p);
      let pw = 1;
      for (let i = 0; i < (p - 1) / 2; i++) pw = (pw * a) % p;
      const expected = pw === 1 ? 1 : pw === p - 1 ? -1 : 0;
      expect(sym).toBe(expected);
    }
  });
});
