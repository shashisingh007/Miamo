import { describe, it, expect } from 'vitest';
import { rk4ODE } from '../rk4ODE';

describe('rk4ODE', () => {
  it('solves y\' = y (exponential)', () => {
    const out = rk4ODE((_, y) => y, 0, 1, 1, { steps: 100 });
    const last = out[out.length - 1];
    expect(last.t).toBeCloseTo(1, 10);
    expect(last.y).toBeCloseTo(Math.E, 5);
  });

  it('solves y\' = -2y', () => {
    const out = rk4ODE((_, y) => -2 * y, 0, 1, 1, { steps: 100 });
    expect(out[out.length - 1].y).toBeCloseTo(Math.exp(-2), 5);
  });

  it('solves y\' = t', () => {
    const out = rk4ODE((t) => t, 0, 0, 2, { steps: 50 });
    expect(out[out.length - 1].y).toBeCloseTo(2, 8);
  });

  it('solves y\' = cos(t)', () => {
    const out = rk4ODE((t) => Math.cos(t), 0, 0, Math.PI / 2, { steps: 50 });
    expect(out[out.length - 1].y).toBeCloseTo(1, 6);
  });

  it('returns N+1 samples', () => {
    const out = rk4ODE(() => 1, 0, 0, 1, { steps: 10 });
    expect(out.length).toBe(11);
  });

  it('first sample is initial', () => {
    const out = rk4ODE(() => 1, 5, 7, 6, { steps: 4 });
    expect(out[0]).toEqual({ t: 5, y: 7 });
  });

  it('throws on bad steps', () => {
    expect(() => rk4ODE(() => 1, 0, 0, 1, { steps: 0 })).toThrow();
    expect(() => rk4ODE(() => 1, 0, 0, 1, { steps: 1.5 })).toThrow();
  });

  it('throws on non-finite inputs', () => {
    expect(() => rk4ODE(() => 1, NaN, 0, 1)).toThrow();
  });

  it('handles tEnd == t0 with single step (no movement)', () => {
    const out = rk4ODE(() => 1, 2, 3, 2, { steps: 1 });
    expect(out[out.length - 1]).toEqual({ t: 2, y: 3 });
  });

  it('default steps is 100', () => {
    const out = rk4ODE(() => 1, 0, 0, 1);
    expect(out.length).toBe(101);
  });
});
