import { describe, it, expect } from 'vitest';
import { pollardRhoFactor } from '../pollardRhoFactorization';

describe('pollardRhoFactor', () => {
  it('throws on n <= 1', () => {
    expect(() => pollardRhoFactor(1n)).toThrow(RangeError);
    expect(() => pollardRhoFactor(0n)).toThrow(RangeError);
  });

  it('even returns 2', () => {
    expect(pollardRhoFactor(2n)).toBe(2n);
    expect(pollardRhoFactor(10n)).toBe(2n);
  });

  it('15 = 3*5 returns 3 or 5', () => {
    const f = pollardRhoFactor(15n)!;
    expect([3n, 5n]).toContain(f);
  });

  it('21 = 3*7', () => {
    const f = pollardRhoFactor(21n)!;
    expect([3n, 7n]).toContain(f);
  });

  it('91 = 7*13', () => {
    const f = pollardRhoFactor(91n)!;
    expect([7n, 13n]).toContain(f);
  });

  it('8051 = 83*97', () => {
    const f = pollardRhoFactor(8051n)!;
    expect([83n, 97n]).toContain(f);
  });

  it('returned factor divides n', () => {
    const n = 9_999_991n * 9_999_973n;
    const f = pollardRhoFactor(n)!;
    expect(n % f).toBe(0n);
    expect(f).not.toBe(1n);
    expect(f).not.toBe(n);
  });

  it('9 = 3*3', () => {
    expect(pollardRhoFactor(9n)).toBe(3n);
  });

  it('25 = 5*5', () => {
    expect(pollardRhoFactor(25n)).toBe(5n);
  });

  it('large semiprime', () => {
    const p = 1_000_003n;
    const q = 1_000_033n;
    const n = p * q;
    const f = pollardRhoFactor(n)!;
    expect([p, q]).toContain(f);
  });

  it('1001 = 7*11*13 factor divides', () => {
    const f = pollardRhoFactor(1001n)!;
    expect(1001n % f).toBe(0n);
    expect(f).not.toBe(1n);
    expect(f).not.toBe(1001n);
  });

  it('221 = 13*17', () => {
    const f = pollardRhoFactor(221n)!;
    expect([13n, 17n]).toContain(f);
  });
});
