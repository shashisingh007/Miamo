import { describe, it, expect } from 'vitest';
import { chebyshevInterp } from '../chebyshevInterp';

describe('chebyshevInterp', () => {
  it('reproduces a quadratic exactly', () => {
    const f = (x: number) => 2 * x * x - 3 * x + 1;
    const I = chebyshevInterp(f, 4, -2, 3);
    for (const x of [-2, -1, 0, 0.7, 1.4, 2.9]) {
      expect(I.evaluate(x)).toBeCloseTo(f(x), 9);
    }
  });

  it('hits node values exactly', () => {
    const f = (x: number) => Math.sin(x);
    const I = chebyshevInterp(f, 6, 0, Math.PI);
    for (let k = 0; k < I.nodes.length; k++) {
      expect(I.evaluate(I.nodes[k])).toBeCloseTo(I.values[k], 12);
    }
  });

  it('approximates sin closely with n=12', () => {
    const f = (x: number) => Math.sin(x);
    const I = chebyshevInterp(f, 12, -Math.PI, Math.PI);
    for (const x of [-3, -1.2, 0.4, 2.5]) {
      expect(I.evaluate(x)).toBeCloseTo(f(x), 6);
    }
  });

  it('approximates exp closely', () => {
    const f = (x: number) => Math.exp(x);
    const I = chebyshevInterp(f, 14, -1, 1);
    for (const x of [-0.9, -0.3, 0.5, 0.95]) {
      expect(I.evaluate(x)).toBeCloseTo(f(x), 8);
    }
  });

  it('node count is n+1 and bracketed by interval', () => {
    const I = chebyshevInterp((x) => x, 5, 0, 10);
    expect(I.nodes.length).toBe(6);
    const lo = Math.min(...I.nodes), hi = Math.max(...I.nodes);
    expect(lo).toBeCloseTo(0, 10);
    expect(hi).toBeCloseTo(10, 10);
  });

  it('rejects non-positive degree', () => {
    expect(() => chebyshevInterp((x) => x, 0, 0, 1)).toThrow();
  });

  it('rejects non-integer degree', () => {
    expect(() => chebyshevInterp((x) => x, 2.5, 0, 1)).toThrow();
  });

  it('rejects inverted interval', () => {
    expect(() => chebyshevInterp((x) => x, 4, 1, 0)).toThrow();
  });

  it('rejects degenerate interval', () => {
    expect(() => chebyshevInterp((x) => x, 4, 1, 1)).toThrow();
  });

  it('rejects non-finite endpoints', () => {
    expect(() => chebyshevInterp((x) => x, 4, 0, Infinity)).toThrow();
  });

  it('evaluate rejects non-finite x', () => {
    const I = chebyshevInterp((x) => x, 4, 0, 1);
    expect(() => I.evaluate(NaN)).toThrow();
  });
});
