import { describe, it, expect } from 'vitest';
import { trapezoidalRule, adaptiveTrapezoid } from '../trapezoidalRule';

describe('trapezoidalRule', () => {
  it('integrates constant', () => {
    expect(trapezoidalRule(() => 5, 0, 2, 4)).toBeCloseTo(10, 10);
  });

  it('integrates linear exactly', () => {
    expect(trapezoidalRule((x) => 2 * x, 0, 3, 5)).toBeCloseTo(9, 10);
  });

  it('integrates x^2 with convergence', () => {
    expect(trapezoidalRule((x) => x * x, 0, 1, 1000)).toBeCloseTo(1 / 3, 5);
  });

  it('integrates sin from 0 to pi', () => {
    expect(trapezoidalRule(Math.sin, 0, Math.PI, 1000)).toBeCloseTo(2, 4);
  });

  it('a==b returns 0', () => {
    expect(trapezoidalRule((x) => x * x + 7, 3, 3, 4)).toBe(0);
  });

  it('reversed interval negates', () => {
    const fwd = trapezoidalRule((x) => x * x, 0, 2, 100);
    const rev = trapezoidalRule((x) => x * x, 2, 0, 100);
    expect(rev).toBeCloseTo(-fwd, 10);
  });

  it('throws when n=0', () => {
    expect(() => trapezoidalRule((x) => x, 0, 1, 0)).toThrow(/positive integer/);
  });

  it('throws on negative n', () => {
    expect(() => trapezoidalRule((x) => x, 0, 1, -3)).toThrow(/positive integer/);
  });

  it('throws on non-integer n', () => {
    expect(() => trapezoidalRule((x) => x, 0, 1, 2.5)).toThrow(/positive integer/);
  });

  it('n=1 single trapezoid', () => {
    expect(trapezoidalRule((x) => x, 0, 4, 1)).toBeCloseTo(8, 10);
  });

  it('error decreases with larger n', () => {
    const target = 1 / 3;
    const e10 = Math.abs(trapezoidalRule((x) => x * x, 0, 1, 10) - target);
    const e1000 = Math.abs(trapezoidalRule((x) => x * x, 0, 1, 1000) - target);
    expect(e1000).toBeLessThan(e10);
  });
});

describe('adaptiveTrapezoid', () => {
  it('integrates x^2 to within tol', () => {
    expect(adaptiveTrapezoid((x) => x * x, 0, 1, { tol: 1e-6 })).toBeCloseTo(1 / 3, 4);
  });

  it('a==b returns 0', () => {
    expect(adaptiveTrapezoid((x) => x, 2, 2)).toBe(0);
  });

  it('integrates sin from 0 to pi', () => {
    expect(adaptiveTrapezoid(Math.sin, 0, Math.PI, { tol: 1e-7 })).toBeCloseTo(2, 5);
  });

  it('handles reversed interval', () => {
    expect(adaptiveTrapezoid((x) => x * x, 1, 0, { tol: 1e-7 })).toBeCloseTo(-1 / 3, 4);
  });
});
