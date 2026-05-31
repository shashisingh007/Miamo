import { describe, it, expect } from 'vitest';
import { clenshawCurtisQuad, clenshawCurtisNodes } from '../clenshawCurtisQuad';

describe('clenshawCurtisQuad', () => {
  it('rejects non-positive n', () => {
    expect(() => clenshawCurtisNodes(0)).toThrow();
    expect(() => clenshawCurtisNodes(-1)).toThrow();
  });

  it('rejects non-integer n', () => {
    expect(() => clenshawCurtisNodes(2.5)).toThrow();
  });

  it('rejects non-function f', () => {
    expect(() => clenshawCurtisQuad(null as any, 0, 1, 8)).toThrow();
  });

  it('rejects non-finite bounds', () => {
    expect(() => clenshawCurtisQuad((x) => x, NaN, 1, 8)).toThrow();
  });

  it('a==b => 0', () => {
    expect(clenshawCurtisQuad((x) => x, 5, 5, 8)).toBe(0);
  });

  it('weights sum to 2 for [-1,1]', () => {
    for (const n of [4, 8, 16, 32]) {
      const { weights } = clenshawCurtisNodes(n);
      const s = weights.reduce((a, b) => a + b, 0);
      expect(s).toBeCloseTo(2, 9);
    }
  });

  it('nodes sorted ascending in [-1,1]', () => {
    const { nodes } = clenshawCurtisNodes(8);
    for (let i = 1; i < nodes.length; i++) expect(nodes[i]).toBeGreaterThan(nodes[i - 1]);
    expect(nodes[0]).toBeCloseTo(-1, 10);
    expect(nodes[nodes.length - 1]).toBeCloseTo(1, 10);
  });

  it('integral of x^2 from 0 to 1 = 1/3', () => {
    expect(clenshawCurtisQuad((x) => x * x, 0, 1, 8)).toBeCloseTo(1 / 3, 10);
  });

  it('integral of sin(x) from 0 to pi = 2', () => {
    expect(clenshawCurtisQuad(Math.sin, 0, Math.PI, 16)).toBeCloseTo(2, 10);
  });

  it('integral of exp(x) from 0 to 1 = e-1', () => {
    expect(clenshawCurtisQuad(Math.exp, 0, 1, 16)).toBeCloseTo(Math.E - 1, 10);
  });

  it('integral of 4/(1+x^2) from 0 to 1 = pi', () => {
    expect(clenshawCurtisQuad((x) => 4 / (1 + x * x), 0, 1, 32)).toBeCloseTo(Math.PI, 10);
  });

  it('reverse bounds flips sign', () => {
    const a = clenshawCurtisQuad((x) => x ** 3, 0, 2, 16);
    const b = clenshawCurtisQuad((x) => x ** 3, 2, 0, 16);
    expect(b).toBeCloseTo(-a, 10);
  });

  it('integral of constant 1 over [0,5] = 5', () => {
    expect(clenshawCurtisQuad(() => 1, 0, 5, 4)).toBeCloseTo(5, 10);
  });

  it('integral of cos over [-pi/2, pi/2] = 2', () => {
    expect(clenshawCurtisQuad(Math.cos, -Math.PI / 2, Math.PI / 2, 16)).toBeCloseTo(2, 10);
  });
});
