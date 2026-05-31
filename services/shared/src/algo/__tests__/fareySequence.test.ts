import { describe, it, expect } from 'vitest';
import { fareySequence, fareyLength } from '../fareySequence';

describe('fareySequence', () => {
  it('throws on n < 1', () => {
    expect(() => fareySequence(0)).toThrow(RangeError);
  });

  it('throws on non-integer', () => {
    expect(() => fareySequence(1.5)).toThrow(RangeError);
  });

  it('F_1 = [0/1, 1/1]', () => {
    expect(fareySequence(1)).toEqual([
      { numerator: 0, denominator: 1 },
      { numerator: 1, denominator: 1 },
    ]);
  });

  it('F_2 = [0/1, 1/2, 1/1]', () => {
    expect(fareySequence(2)).toEqual([
      { numerator: 0, denominator: 1 },
      { numerator: 1, denominator: 2 },
      { numerator: 1, denominator: 1 },
    ]);
  });

  it('F_3 = [0/1, 1/3, 1/2, 2/3, 1/1]', () => {
    expect(fareySequence(3)).toEqual([
      { numerator: 0, denominator: 1 },
      { numerator: 1, denominator: 3 },
      { numerator: 1, denominator: 2 },
      { numerator: 2, denominator: 3 },
      { numerator: 1, denominator: 1 },
    ]);
  });

  it('F_4', () => {
    expect(fareySequence(4)).toEqual([
      { numerator: 0, denominator: 1 },
      { numerator: 1, denominator: 4 },
      { numerator: 1, denominator: 3 },
      { numerator: 1, denominator: 2 },
      { numerator: 2, denominator: 3 },
      { numerator: 3, denominator: 4 },
      { numerator: 1, denominator: 1 },
    ]);
  });

  it('all fractions reduced (gcd=1)', () => {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    for (const f of fareySequence(8)) {
      const a = f.numerator;
      const b = f.denominator;
      if (a === 0) continue;
      expect(gcd(a, b)).toBe(1);
    }
  });

  it('strictly increasing', () => {
    const seq = fareySequence(10);
    for (let i = 1; i < seq.length; i += 1) {
      const a = seq[i - 1];
      const b = seq[i];
      expect(a.numerator * b.denominator).toBeLessThan(b.numerator * a.denominator);
    }
  });

  it('|F_5| = 11', () => {
    expect(fareyLength(5)).toBe(11);
  });

  it('|F_6| = 13', () => {
    expect(fareyLength(6)).toBe(13);
  });

  it('|F_8| = 23', () => {
    expect(fareyLength(8)).toBe(23);
  });

  it('starts at 0/1 and ends at 1/1', () => {
    const seq = fareySequence(7);
    expect(seq[0]).toEqual({ numerator: 0, denominator: 1 });
    expect(seq[seq.length - 1]).toEqual({ numerator: 1, denominator: 1 });
  });

  it('all denominators <= n', () => {
    for (const f of fareySequence(10)) expect(f.denominator).toBeLessThanOrEqual(10);
  });
});
