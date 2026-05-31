import { describe, it, expect } from 'vitest';
import { eulerMethodODE } from '../eulerMethodODE';

describe('eulerMethodODE', () => {
  it('solves y\' = 1 exactly', () => {
    const out = eulerMethodODE(() => 1, 0, 0, 5, { steps: 5 });
    expect(out[out.length - 1].y).toBeCloseTo(5, 10);
  });

  it('approximates y\' = y', () => {
    const out = eulerMethodODE((_, y) => y, 0, 1, 1, { steps: 10000 });
    expect(out[out.length - 1].y).toBeCloseTo(Math.E, 2);
  });

  it('error decreases as steps grow', () => {
    const e10 = Math.abs(eulerMethodODE((_, y) => y, 0, 1, 1, { steps: 10 }).slice(-1)[0].y - Math.E);
    const e1000 = Math.abs(eulerMethodODE((_, y) => y, 0, 1, 1, { steps: 1000 }).slice(-1)[0].y - Math.E);
    expect(e1000).toBeLessThan(e10);
  });

  it('returns N+1 samples', () => {
    const out = eulerMethodODE(() => 1, 0, 0, 1, { steps: 7 });
    expect(out.length).toBe(8);
  });

  it('first sample is initial', () => {
    const out = eulerMethodODE(() => 0, 4, 9, 8);
    expect(out[0]).toEqual({ t: 4, y: 9 });
  });

  it('solves y\' = -y', () => {
    const out = eulerMethodODE((_, y) => -y, 0, 1, 1, { steps: 10000 });
    expect(out[out.length - 1].y).toBeCloseTo(1 / Math.E, 2);
  });

  it('throws on bad steps', () => {
    expect(() => eulerMethodODE(() => 1, 0, 0, 1, { steps: -1 })).toThrow();
    expect(() => eulerMethodODE(() => 1, 0, 0, 1, { steps: 2.7 })).toThrow();
  });

  it('throws on non-finite inputs', () => {
    expect(() => eulerMethodODE(() => 1, 0, Infinity, 1)).toThrow();
  });

  it('default steps is 100', () => {
    const out = eulerMethodODE(() => 1, 0, 0, 1);
    expect(out.length).toBe(101);
  });

  it('tEnd == t0 yields no movement', () => {
    const out = eulerMethodODE(() => 999, 3, 4, 3, { steps: 5 });
    expect(out[out.length - 1].y).toBe(4);
  });
});
