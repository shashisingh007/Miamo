import { describe, it, expect } from 'vitest';
import { inversePowerIteration } from '../inversePowerIteration';

describe('inversePowerIteration', () => {
  it('finds smallest eigenvalue near shift=0 of symmetric matrix', () => {
    // Eigenvalues of [[2,1],[1,2]] are 3 and 1.
    const r = inversePowerIteration([[2, 1], [1, 2]], 0);
    expect(r.converged).toBe(true);
    expect(r.eigenvalue).toBeCloseTo(1, 8);
  });

  it('finds eigenvalue near shift=3', () => {
    const r = inversePowerIteration([[2, 1], [1, 2]], 2.5);
    expect(r.eigenvalue).toBeCloseTo(3, 8);
  });

  it('eigenvector satisfies A v ≈ lambda v', () => {
    const A = [[4, 1, 0], [1, 3, 1], [0, 1, 2]];
    const r = inversePowerIteration(A, 0);
    const v = r.eigenvector;
    const Av = [0, 0, 0];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) Av[i] += A[i][j] * v[j];
    for (let i = 0; i < 3; i++) expect(Av[i]).toBeCloseTo(r.eigenvalue * v[i], 4);
  });

  it('eigenvector unit norm', () => {
    const r = inversePowerIteration([[2, 1], [1, 2]], 0);
    let s = 0;
    for (const x of r.eigenvector) s += x * x;
    expect(Math.sqrt(s)).toBeCloseTo(1, 9);
  });

  it('diagonal matrix returns shifted-closest diagonal', () => {
    const A = [[5, 0, 0], [0, 1, 0], [0, 0, 9]];
    const r = inversePowerIteration(A, 4.6);
    expect(r.eigenvalue).toBeCloseTo(5, 6);
  });

  it('rejects singular shifted matrix (shift = exact eigenvalue)', () => {
    expect(() => inversePowerIteration([[2, 0], [0, 2]], 2)).toThrow(/singular/);
  });

  it('rejects empty matrix', () => {
    expect(() => inversePowerIteration([], 0)).toThrow();
  });

  it('rejects non-square', () => {
    expect(() => inversePowerIteration([[1, 2, 3], [4, 5, 6]], 0)).toThrow();
  });

  it('rejects bad tolerance', () => {
    expect(() => inversePowerIteration([[1]], 0, { tolerance: 0 })).toThrow();
  });

  it('rejects bad maxIterations', () => {
    expect(() => inversePowerIteration([[1]], 0, { maxIterations: 0 })).toThrow();
  });

  it('rejects non-finite shift', () => {
    expect(() => inversePowerIteration([[1]], Infinity)).toThrow();
  });
});
