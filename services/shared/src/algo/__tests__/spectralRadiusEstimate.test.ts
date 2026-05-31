import { describe, it, expect } from 'vitest';
import { spectralRadiusEstimate } from '../spectralRadiusEstimate';

describe('spectralRadiusEstimate', () => {
  it('throws on empty', () => {
    expect(() => spectralRadiusEstimate([])).toThrow();
  });

  it('throws on non-square', () => {
    expect(() => spectralRadiusEstimate([[1, 2, 3]])).toThrow();
  });

  it('throws on bad iterations', () => {
    expect(() => spectralRadiusEstimate([[1]], { iterations: 0 })).toThrow();
  });

  it('throws on bad tolerance', () => {
    expect(() => spectralRadiusEstimate([[1]], { tolerance: -1 })).toThrow();
  });

  it('1x1 returns |a|', () => {
    expect(spectralRadiusEstimate([[5]])).toBeCloseTo(5, 8);
    expect(spectralRadiusEstimate([[-3]])).toBeCloseTo(3, 8);
  });

  it('diagonal returns max |entry|', () => {
    const r = spectralRadiusEstimate([[1, 0, 0], [0, -7, 0], [0, 0, 3]], { iterations: 500 });
    expect(r).toBeCloseTo(7, 4);
  });

  it('symmetric SPD', () => {
    // [[2,-1],[-1,2]] eigenvalues 1, 3 => spectral radius 3
    const r = spectralRadiusEstimate([[2, -1], [-1, 2]], { iterations: 500 });
    expect(r).toBeCloseTo(3, 4);
  });

  it('symmetric 3x3 known eigenvalues', () => {
    // Laplacian-like: 2 -1 0 / -1 2 -1 / 0 -1 2 has eigenvalues 2-sqrt(2), 2, 2+sqrt(2)
    const r = spectralRadiusEstimate([[2, -1, 0], [-1, 2, -1], [0, -1, 2]], { iterations: 500 });
    expect(r).toBeCloseTo(2 + Math.SQRT2, 3);
  });

  it('zero matrix => 0', () => {
    const r = spectralRadiusEstimate([[0, 0], [0, 0]]);
    expect(r).toBe(0);
  });

  it('negative diagonal returns absolute', () => {
    const r = spectralRadiusEstimate([[-5, 0], [0, -2]], { iterations: 300 });
    expect(r).toBeCloseTo(5, 4);
  });

  it('seeded reproducibility', () => {
    const A = [[2, -1], [-1, 2]];
    const a = spectralRadiusEstimate(A, { iterations: 100, seed: 42 });
    const b = spectralRadiusEstimate(A, { iterations: 100, seed: 42 });
    expect(a).toBeCloseTo(b, 12);
  });

  it('does not mutate input', () => {
    const A = [[1, 2], [3, 4]];
    const ref = A.map((r) => r.slice());
    spectralRadiusEstimate(A);
    expect(A).toEqual(ref);
  });

  it('returns finite non-negative number', () => {
    const r = spectralRadiusEstimate([[1, 2], [3, 4]]);
    expect(Number.isFinite(r)).toBe(true);
    expect(r).toBeGreaterThanOrEqual(0);
  });

  it('larger 4x4 diagonal', () => {
    const A = [[0.5, 0, 0, 0], [0, 1, 0, 0], [0, 0, 2, 0], [0, 0, 0, -3]];
    const r = spectralRadiusEstimate(A, { iterations: 500 });
    expect(r).toBeCloseTo(3, 3);
  });
});
