import { describe, it, expect } from 'vitest';
import { lehmanFactor } from '../lehmanFactor';

function divides(d: bigint, n: bigint): boolean {
  return n % d === 0n && d > 1n && d < n;
}

describe('lehmanFactor', () => {
  it('rejects n < 2', () => {
    expect(() => lehmanFactor(1)).toThrow();
    expect(() => lehmanFactor(0)).toThrow();
  });

  it('even n returns 2', () => {
    expect(lehmanFactor(4)).toBe(2n);
    expect(lehmanFactor(100)).toBe(2n);
  });

  it('prime returns null', () => {
    expect(lehmanFactor(7)).toBeNull();
    expect(lehmanFactor(13)).toBeNull();
    expect(lehmanFactor(97)).toBeNull();
  });

  it('factors 15 = 3*5', () => {
    const f = lehmanFactor(15)!;
    expect(divides(f, 15n)).toBe(true);
  });

  it('factors 21 = 3*7', () => {
    const f = lehmanFactor(21)!;
    expect(divides(f, 21n)).toBe(true);
  });

  it('factors 35 = 5*7', () => {
    const f = lehmanFactor(35)!;
    expect(divides(f, 35n)).toBe(true);
  });

  it('factors 91 = 7*13', () => {
    const f = lehmanFactor(91)!;
    expect(divides(f, 91n)).toBe(true);
  });

  it('factors 143 = 11*13', () => {
    const f = lehmanFactor(143)!;
    expect(divides(f, 143n)).toBe(true);
  });

  it('factors 1147 = 31*37', () => {
    const f = lehmanFactor(1147)!;
    expect(divides(f, 1147n)).toBe(true);
  });

  it('factors a perfect square 49 = 7*7', () => {
    expect(lehmanFactor(49)).toBe(7n);
  });

  it('bigint input', () => {
    const f = lehmanFactor(323n)!; // 17 * 19
    expect(divides(f, 323n)).toBe(true);
  });

  it('factors 8051 = 83*97', () => {
    const f = lehmanFactor(8051)!;
    expect(divides(f, 8051n)).toBe(true);
  });
});
