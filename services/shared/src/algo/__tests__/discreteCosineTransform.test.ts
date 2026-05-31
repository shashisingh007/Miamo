import { describe, it, expect } from 'vitest';
import { dct2, idct2 } from '../discreteCosineTransform';

function close(a: number[], b: number[], tol = 1e-9): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (Math.abs(a[i] - b[i]) > tol) return false;
  return true;
}

describe('discreteCosineTransform (DCT-II/III)', () => {
  it('dct2 rejects non-array', () => {
    expect(() => dct2(42 as any)).toThrow(TypeError);
  });

  it('idct2 rejects non-array', () => {
    expect(() => idct2(42 as any)).toThrow(TypeError);
  });

  it('rejects non-finite values', () => {
    expect(() => dct2([1, NaN, 2])).toThrow(RangeError);
    expect(() => idct2([1, Infinity])).toThrow(RangeError);
  });

  it('empty array passes through', () => {
    expect(dct2([])).toEqual([]);
    expect(idct2([])).toEqual([]);
  });

  it('single element scaled by sqrt(1/1) = 1', () => {
    expect(dct2([5])).toEqual([5]);
    expect(idct2([5])).toEqual([5]);
  });

  it('round trip on small signal', () => {
    const x = [1, 2, 3, 4];
    const r = idct2(dct2(x));
    expect(close(r, x)).toBe(true);
  });

  it('round trip on length 8', () => {
    const x = [1, -2, 3, 4, 5, -6, 7, 8];
    const r = idct2(dct2(x));
    expect(close(r, x)).toBe(true);
  });

  it('round trip on length 16 random', () => {
    const x = Array.from({ length: 16 }, () => Math.random() * 100 - 50);
    const r = idct2(dct2(x));
    expect(close(r, x, 1e-8)).toBe(true);
  });

  it('orthonormality: DC coefficient = sqrt(N)*mean', () => {
    const x = [1, 1, 1, 1];
    const d = dct2(x);
    expect(d[0]).toBeCloseTo(2, 9); // sqrt(1/4)*4 = 2
    for (let i = 1; i < 4; i += 1) expect(d[i]).toBeCloseTo(0, 9);
  });

  it('linearity: dct(a+b) = dct(a)+dct(b)', () => {
    const a = [1, 2, 3, 4];
    const b = [5, 6, 7, 8];
    const dctA = dct2(a);
    const dctB = dct2(b);
    const dctSum = dct2([6, 8, 10, 12]);
    for (let i = 0; i < 4; i += 1) {
      expect(dctSum[i]).toBeCloseTo(dctA[i] + dctB[i], 9);
    }
  });

  it('preserves L2 energy (Parseval)', () => {
    const x = [3, -1, 4, 1, 5, 9, 2, 6];
    const d = dct2(x);
    const e1 = x.reduce((s, v) => s + v * v, 0);
    const e2 = d.reduce((s, v) => s + v * v, 0);
    expect(e2).toBeCloseTo(e1, 9);
  });

  it('zero input', () => {
    const x = [0, 0, 0, 0];
    expect(dct2(x).every((v) => Math.abs(v) < 1e-12)).toBe(true);
  });

  it('round trip on length 2', () => {
    const x = [7, 3];
    expect(close(idct2(dct2(x)), x)).toBe(true);
  });

  it('round trip on prime length (5)', () => {
    const x = [1, 2, 3, 4, 5];
    expect(close(idct2(dct2(x)), x)).toBe(true);
  });

  it('output length matches input', () => {
    expect(dct2([1, 2, 3])).toHaveLength(3);
    expect(idct2([1, 2, 3])).toHaveLength(3);
  });

  it('idempotent over many round trips', () => {
    let x = [1, 2, 3, 4, 5, 6, 7, 8];
    for (let k = 0; k < 5; k += 1) x = idct2(dct2(x));
    expect(close(x, [1, 2, 3, 4, 5, 6, 7, 8], 1e-6)).toBe(true);
  });
});
