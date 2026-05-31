import { describe, it, expect } from 'vitest';
import { adaptiveSimpson } from '../adaptiveSimpson';

describe('adaptiveSimpson', () => {
  it('rejects non-function f', () => {
    expect(() => adaptiveSimpson(null as any, 0, 1)).toThrow();
  });

  it('rejects non-finite bounds', () => {
    expect(() => adaptiveSimpson((x) => x, NaN, 1)).toThrow();
    expect(() => adaptiveSimpson((x) => x, 0, Infinity)).toThrow();
  });

  it('rejects non-positive tol', () => {
    expect(() => adaptiveSimpson((x) => x, 0, 1, { tol: 0 })).toThrow();
  });

  it('rejects bad maxDepth', () => {
    expect(() => adaptiveSimpson((x) => x, 0, 1, { maxDepth: 0 })).toThrow();
  });

  it('a == b => 0', () => {
    expect(adaptiveSimpson((x) => x, 5, 5)).toBe(0);
  });

  it('integral of x from 0 to 1 = 0.5', () => {
    expect(adaptiveSimpson((x) => x, 0, 1)).toBeCloseTo(0.5, 10);
  });

  it('integral of x^2 from 0 to 1 = 1/3', () => {
    expect(adaptiveSimpson((x) => x * x, 0, 1)).toBeCloseTo(1 / 3, 10);
  });

  it('integral of sin(x) from 0 to pi = 2', () => {
    expect(adaptiveSimpson(Math.sin, 0, Math.PI)).toBeCloseTo(2, 10);
  });

  it('integral of exp(x) from 0 to 1 = e - 1', () => {
    expect(adaptiveSimpson(Math.exp, 0, 1)).toBeCloseTo(Math.E - 1, 10);
  });

  it('reverse bounds flips sign', () => {
    const a = adaptiveSimpson((x) => x * x, 0, 1);
    const b = adaptiveSimpson((x) => x * x, 1, 0);
    expect(b).toBeCloseTo(-a, 10);
  });

  it('integral of 4/(1+x^2) from 0 to 1 = pi', () => {
    expect(adaptiveSimpson((x) => 4 / (1 + x * x), 0, 1)).toBeCloseTo(Math.PI, 10);
  });

  it('integral of 1/sqrt(x) on [0.001,1] ≈ 2*(1-sqrt(0.001))', () => {
    const result = adaptiveSimpson((x) => 1 / Math.sqrt(x), 0.001, 1);
    expect(result).toBeCloseTo(2 * (1 - Math.sqrt(0.001)), 6);
  });

  it('respects tol setting (looser tol still close)', () => {
    const r = adaptiveSimpson((x) => x * x * x, 0, 2, { tol: 1e-6 });
    expect(r).toBeCloseTo(4, 5);
  });
});
