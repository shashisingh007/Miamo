import { describe, it, expect } from 'vitest';
import { powerIteration } from '../powerIteration';

describe('powerIteration', () => {
  it('diagonal matrix dominant eigenvalue', () => {
    const A = [
      [5, 0, 0],
      [0, 2, 0],
      [0, 0, 1],
    ];
    const r = powerIteration(A);
    expect(Math.abs(r.eigenvalue - 5)).toBeLessThan(1e-6);
    expect(r.converged).toBe(true);
  });

  it('symmetric 2x2', () => {
    const A = [
      [2, 1],
      [1, 2],
    ];
    const r = powerIteration(A);
    expect(Math.abs(r.eigenvalue - 3)).toBeLessThan(1e-6);
  });

  it('eigenvector unit norm', () => {
    const A = [
      [4, 1],
      [1, 3],
    ];
    const r = powerIteration(A);
    let s = 0;
    for (const x of r.eigenvector) s += x * x;
    expect(Math.abs(Math.sqrt(s) - 1)).toBeLessThan(1e-9);
  });

  it('rejects non-square', () => {
    expect(() => powerIteration([[1, 2, 3], [4, 5, 6]] as any)).toThrow();
  });

  it('rejects empty', () => {
    expect(() => powerIteration([])).toThrow();
  });

  it('zero matrix => zero eigenvalue', () => {
    const A = [
      [0, 0],
      [0, 0],
    ];
    const r = powerIteration(A);
    expect(r.eigenvalue).toBe(0);
  });

  it('respects maxIterations', () => {
    const A = [
      [3, 1],
      [1, 3],
    ];
    const r = powerIteration(A, { maxIterations: 2 });
    expect(r.iterations).toBeLessThanOrEqual(3);
  });

  it('initial vector accepted', () => {
    const A = [
      [4, 0],
      [0, 1],
    ];
    const r = powerIteration(A, { initial: [1, 1] });
    expect(Math.abs(r.eigenvalue - 4)).toBeLessThan(1e-6);
  });

  it('initial size mismatch throws', () => {
    expect(() => powerIteration([[1, 0], [0, 1]], { initial: [1, 2, 3] })).toThrow();
  });

  it('1x1 matrix', () => {
    const r = powerIteration([[7]]);
    expect(Math.abs(r.eigenvalue - 7)).toBeLessThan(1e-9);
  });

  it('Av ≈ λv', () => {
    const A = [
      [2, 1],
      [1, 2],
    ];
    const r = powerIteration(A);
    const v = r.eigenvector;
    const Av = [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]];
    expect(Math.abs(Av[0] - r.eigenvalue * v[0])).toBeLessThan(1e-5);
    expect(Math.abs(Av[1] - r.eigenvalue * v[1])).toBeLessThan(1e-5);
  });
});
