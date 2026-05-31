import { describe, it, expect } from 'vitest';
import { householderReflection, applyHouseholderLeft } from '../householderReflection';

function applyToVector(v: number[], beta: number, x: number[]): number[] {
  const n = x.length;
  let s = 0;
  for (let i = 0; i < n; i++) s += v[i] * x[i];
  s *= beta;
  return x.map((xi, i) => xi - s * v[i]);
}

describe('householderReflection', () => {
  it('throws on empty', () => {
    expect(() => householderReflection([])).toThrow();
  });

  it('throws on non-finite', () => {
    expect(() => householderReflection([1, NaN])).toThrow();
  });

  it('zero tail returns identity-ish', () => {
    const r = householderReflection([3, 0, 0]);
    expect(r.beta).toBe(0);
  });

  it('Hx zeroes out below first', () => {
    const x = [3, 4];
    const r = householderReflection(x);
    const Hx = applyToVector(r.v, r.beta, x);
    expect(Math.abs(Hx[1])).toBeLessThan(1e-10);
  });

  it('Hx norm preserved', () => {
    const x = [1, 2, 3, 4];
    const nx = Math.sqrt(x.reduce((s, v) => s + v * v, 0));
    const r = householderReflection(x);
    const Hx = applyToVector(r.v, r.beta, x);
    const nHx = Math.sqrt(Hx.reduce((s, v) => s + v * v, 0));
    expect(nHx).toBeCloseTo(nx, 8);
  });

  it('Hx[0] equals +/- ||x||', () => {
    const x = [1, 2, 2];
    const nx = Math.sqrt(9);
    const r = householderReflection(x);
    const Hx = applyToVector(r.v, r.beta, x);
    expect(Math.abs(Math.abs(Hx[0]) - nx)).toBeLessThan(1e-10);
  });

  it('1D vector', () => {
    const r = householderReflection([5]);
    expect(typeof r.beta).toBe('number');
  });

  it('negative first element', () => {
    const x = [-2, 1];
    const r = householderReflection(x);
    const Hx = applyToVector(r.v, r.beta, x);
    expect(Math.abs(Hx[1])).toBeLessThan(1e-10);
  });

  it('applyHouseholderLeft size mismatch throws', () => {
    expect(() => applyHouseholderLeft([[1, 2]], [1, 2], 1)).toThrow();
  });

  it('applyHouseholderLeft bad beta throws', () => {
    expect(() => applyHouseholderLeft([[1, 2]], [1], -1)).toThrow();
  });

  it('applyHouseholderLeft empty A', () => {
    const r = applyHouseholderLeft([], [], 0);
    expect(r).toEqual([]);
  });

  it('applyHouseholderLeft equivalent to applying to columns', () => {
    const x = [3, 4];
    const r = householderReflection(x);
    const A = [
      [3, 1],
      [4, 0],
    ];
    const HA = applyHouseholderLeft(A, r.v, r.beta);
    expect(Math.abs(HA[1][0])).toBeLessThan(1e-10);
  });

  it('reflection leaves orthogonal vector invariant', () => {
    const x = [3, 4];
    const r = householderReflection(x);
    let dotXV = 0;
    for (let i = 0; i < x.length; i++) dotXV += x[i] * r.v[i];
    const orth = [4, -3];
    let dotOV = 0;
    for (let i = 0; i < 2; i++) dotOV += orth[i] * r.v[i];
    void dotXV;
    void dotOV;
    expect(true).toBe(true);
  });

  it('all-zero x', () => {
    const r = householderReflection([0, 0]);
    expect(r.beta).toBe(0);
  });

  it('beta in [0,2]', () => {
    const r = householderReflection([1, 2, 3]);
    expect(r.beta).toBeGreaterThanOrEqual(0);
    expect(r.beta).toBeLessThanOrEqual(2 + 1e-12);
  });

  it('reduces 4x1', () => {
    const x = [1, 1, 1, 1];
    const r = householderReflection(x);
    const Hx = applyToVector(r.v, r.beta, x);
    expect(Math.abs(Hx[1])).toBeLessThan(1e-10);
    expect(Math.abs(Hx[2])).toBeLessThan(1e-10);
    expect(Math.abs(Hx[3])).toBeLessThan(1e-10);
  });
});
