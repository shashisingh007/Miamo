import { describe, it, expect } from 'vitest';
import { gaussLegendreQuadrature, gaussLegendreNodes } from '../gaussLegendreQuadrature';

describe('gaussLegendreQuadrature', () => {
  it('rejects non-integer n', () => {
    expect(() => gaussLegendreNodes(1.5)).toThrow();
  });

  it('rejects n < 1', () => {
    expect(() => gaussLegendreNodes(0)).toThrow();
  });

  it('rejects non-function f', () => {
    expect(() => gaussLegendreQuadrature(null as any, 0, 1, 5)).toThrow();
  });

  it('rejects non-finite bounds', () => {
    expect(() => gaussLegendreQuadrature((x) => x, NaN, 1, 5)).toThrow();
  });

  it('a==b => 0', () => {
    expect(gaussLegendreQuadrature((x) => x, 5, 5, 5)).toBe(0);
  });

  it('n=2 nodes are ±1/sqrt(3)', () => {
    const { nodes, weights } = gaussLegendreNodes(2);
    expect(nodes[0]).toBeCloseTo(-1 / Math.sqrt(3), 10);
    expect(nodes[1]).toBeCloseTo(1 / Math.sqrt(3), 10);
    expect(weights[0]).toBeCloseTo(1, 10);
    expect(weights[1]).toBeCloseTo(1, 10);
  });

  it('weights sum to 2 for [-1,1]', () => {
    for (const n of [3, 5, 8, 12]) {
      const { weights } = gaussLegendreNodes(n);
      const s = weights.reduce((a, b) => a + b, 0);
      expect(s).toBeCloseTo(2, 10);
    }
  });

  it('exact for polynomial degree 2n-1', () => {
    // n=3 exact for degree 5
    const r = gaussLegendreQuadrature((x) => x ** 5 + 2 * x ** 3 - x + 1, -1, 1, 3);
    // ∫ from -1 to 1: x^5 -> 0, 2 x^3 -> 0, -x -> 0, 1 -> 2
    expect(r).toBeCloseTo(2, 10);
  });

  it('integral of x^2 from 0 to 1 = 1/3 with n=3', () => {
    expect(gaussLegendreQuadrature((x) => x * x, 0, 1, 3)).toBeCloseTo(1 / 3, 10);
  });

  it('integral of sin(x) from 0 to pi = 2', () => {
    expect(gaussLegendreQuadrature(Math.sin, 0, Math.PI, 8)).toBeCloseTo(2, 10);
  });

  it('integral of exp(x) from 0 to 1 = e-1', () => {
    expect(gaussLegendreQuadrature(Math.exp, 0, 1, 8)).toBeCloseTo(Math.E - 1, 10);
  });

  it('reverse bounds flips sign', () => {
    const a = gaussLegendreQuadrature((x) => x * x, 0, 1, 5);
    const b = gaussLegendreQuadrature((x) => x * x, 1, 0, 5);
    expect(b).toBeCloseTo(-a, 10);
  });

  it('integral of 4/(1+x^2) from 0 to 1 = pi', () => {
    expect(gaussLegendreQuadrature((x) => 4 / (1 + x * x), 0, 1, 12)).toBeCloseTo(Math.PI, 10);
  });

  it('nodes are sorted', () => {
    const { nodes } = gaussLegendreNodes(10);
    for (let i = 1; i < nodes.length; i++) expect(nodes[i]).toBeGreaterThan(nodes[i - 1]);
  });
});
