import { describe, it, expect } from 'vitest';
import { fastWalshHadamard } from '../fastWalshHadamard';

describe('fastWalshHadamard', () => {
  it('throws on empty', () => {
    expect(() => fastWalshHadamard([])).toThrow();
  });

  it('throws on non-power-of-2', () => {
    expect(() => fastWalshHadamard([1, 2, 3])).toThrow();
    expect(() => fastWalshHadamard([1, 2, 3, 4, 5])).toThrow();
  });

  it('length 1 identity', () => {
    expect(fastWalshHadamard([7])).toEqual([7]);
  });

  it('length 2', () => {
    expect(fastWalshHadamard([1, 2])).toEqual([3, -1]);
  });

  it('length 4', () => {
    expect(fastWalshHadamard([1, 0, 0, 0])).toEqual([1, 1, 1, 1]);
    expect(fastWalshHadamard([1, 1, 1, 1])).toEqual([4, 0, 0, 0]);
  });

  it('length 8 self-inverse with normalization', () => {
    const a = [3, 1, 4, 1, 5, 9, 2, 6];
    const A = fastWalshHadamard(a);
    const back = fastWalshHadamard(A, true);
    for (let i = 0; i < a.length; i++) expect(back[i]).toBeCloseTo(a[i], 10);
  });

  it('linearity', () => {
    const a = [1, 2, 3, 4];
    const b = [5, 6, 7, 8];
    const A = fastWalshHadamard(a);
    const B = fastWalshHadamard(b);
    const sum = a.map((v, i) => v + b[i]);
    const S = fastWalshHadamard(sum);
    for (let i = 0; i < 4; i++) expect(S[i]).toBeCloseTo(A[i] + B[i], 10);
  });

  it('Parseval: sum(x^2)*n = sum(X^2)', () => {
    const a = [3, 1, 4, 1, 5, 9, 2, 6];
    const A = fastWalshHadamard(a);
    const lhs = a.reduce((s, v) => s + v * v, 0) * a.length;
    const rhs = A.reduce((s, v) => s + v * v, 0);
    expect(lhs).toBeCloseTo(rhs, 6);
  });

  it('inverse on length 16', () => {
    const a = Array.from({ length: 16 }, (_, i) => Math.sin(i));
    const A = fastWalshHadamard(a);
    const back = fastWalshHadamard(A, true);
    for (let i = 0; i < 16; i++) expect(back[i]).toBeCloseTo(a[i], 10);
  });

  it('does not mutate input', () => {
    const a = [1, 2, 3, 4];
    const ref = a.slice();
    fastWalshHadamard(a);
    expect(a).toEqual(ref);
  });

  it('all zeros', () => {
    expect(fastWalshHadamard([0, 0, 0, 0])).toEqual([0, 0, 0, 0]);
  });

  it('throws on non-finite', () => {
    expect(() => fastWalshHadamard([NaN, 0])).toThrow();
  });

  it('forward of impulse = constant', () => {
    const a = [1, 0, 0, 0, 0, 0, 0, 0];
    const A = fastWalshHadamard(a);
    expect(A.every((v) => v === 1)).toBe(true);
  });
});
