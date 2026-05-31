import { describe, it, expect } from 'vitest';
import { gradientDescentMin, gradientDescentNumeric } from '../gradientDescentNumeric';

describe('gradientDescentNumeric', () => {
  it('factory exposes function', () => {
    const api = gradientDescentNumeric();
    expect(typeof api.gradientDescentMin).toBe('function');
  });

  it('minimizes 1D quadratic (x-3)^2', () => {
    const f = (v: number[]) => (v[0] - 3) * (v[0] - 3);
    const r = gradientDescentMin(f, [0]);
    expect(r.converged).toBe(true);
    expect(Math.abs(r.x[0] - 3)).toBeLessThan(1e-3);
    expect(r.value).toBeLessThan(1e-6);
  });

  it('minimizes 2D quadratic', () => {
    const f = (v: number[]) => (v[0] - 1) ** 2 + (v[1] + 2) ** 2;
    const r = gradientDescentMin(f, [10, 10]);
    expect(Math.abs(r.x[0] - 1)).toBeLessThan(1e-2);
    expect(Math.abs(r.x[1] + 2)).toBeLessThan(1e-2);
  });

  it('respects maxIter', () => {
    const f = (v: number[]) => v[0] * v[0];
    const r = gradientDescentMin(f, [100], { maxIter: 5, lr: 1e-3 });
    expect(r.iterations).toBe(5);
    expect(r.converged).toBe(false);
  });

  it('lr controls step size', () => {
    const f = (v: number[]) => v[0] * v[0];
    const slow = gradientDescentMin(f, [10], { lr: 1e-4, maxIter: 50 });
    const fast = gradientDescentMin(f, [10], { lr: 0.5, maxIter: 50 });
    expect(Math.abs(fast.x[0])).toBeLessThan(Math.abs(slow.x[0]));
  });

  it('returns final value at returned x', () => {
    const f = (v: number[]) => v[0] * v[0] + v[1] * v[1];
    const r = gradientDescentMin(f, [3, 4]);
    expect(r.value).toBeCloseTo(f(r.x), 9);
  });

  it('throws on bad inputs', () => {
    expect(() => gradientDescentMin(null as any, [0])).toThrow();
    expect(() => gradientDescentMin((v) => v[0], [])).toThrow();
    expect(() => gradientDescentMin((v) => v[0], [NaN])).toThrow();
    expect(() => gradientDescentMin((v) => v[0], [0], { lr: -1 })).toThrow();
  });

  it('handles starting at minimum', () => {
    const f = (v: number[]) => v[0] * v[0];
    const r = gradientDescentMin(f, [0]);
    expect(r.converged).toBe(true);
    expect(r.iterations).toBe(0);
  });

  it('higher dimensions converge', () => {
    const f = (v: number[]) => v.reduce((s, x, i) => s + (x - i) ** 2, 0);
    const r = gradientDescentMin(f, [0, 0, 0, 0, 0], { maxIter: 2000, lr: 0.1 });
    for (let i = 0; i < 5; i += 1) expect(Math.abs(r.x[i] - i)).toBeLessThan(1e-2);
  });

  it('descent reduces value', () => {
    const f = (v: number[]) => (v[0] - 5) ** 2;
    const start = f([0]);
    const r = gradientDescentMin(f, [0], { maxIter: 50 });
    expect(r.value).toBeLessThan(start);
  });
});
