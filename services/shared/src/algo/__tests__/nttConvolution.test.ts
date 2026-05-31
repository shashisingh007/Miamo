import { describe, it, expect } from 'vitest';
import { nttConvolution, NTT_MODULUS } from '../nttConvolution';

function naiveConv(a: number[], b: number[]): bigint[] {
  if (a.length === 0 || b.length === 0) return [];
  const out: bigint[] = new Array(a.length + b.length - 1).fill(0n);
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      out[i + j] = (out[i + j] + BigInt(a[i]) * BigInt(b[j])) % NTT_MODULUS;
    }
  }
  return out;
}

describe('nttConvolution', () => {
  it('rejects non-array', () => {
    expect(() => nttConvolution(42 as any, [1])).toThrow(TypeError);
  });

  it('empty arrays return []', () => {
    expect(nttConvolution([], [1, 2])).toEqual([]);
    expect(nttConvolution([1], [])).toEqual([]);
  });

  it('rejects negative values', () => {
    expect(() => nttConvolution([-1], [1])).toThrow(RangeError);
  });

  it('rejects values >= modulus', () => {
    expect(() => nttConvolution([Number(NTT_MODULUS)], [1])).toThrow(RangeError);
  });

  it('single element', () => {
    expect(nttConvolution([3], [5])).toEqual([15n]);
  });

  it('two-by-two: (1+2x)(3+4x) = 3 + 10x + 8x^2', () => {
    expect(nttConvolution([1, 2], [3, 4])).toEqual([3n, 10n, 8n]);
  });

  it('matches naive on small ints', () => {
    const a = [1, 2, 3, 4];
    const b = [5, 6, 7];
    expect(nttConvolution(a, b)).toEqual(naiveConv(a, b));
  });

  it('matches naive on size 8 x 8', () => {
    const a = [1, 0, 2, 3, 5, 0, 4, 7];
    const b = [2, 1, 0, 6, 3, 4, 0, 1];
    expect(nttConvolution(a, b)).toEqual(naiveConv(a, b));
  });

  it('matches naive on size 16 x 1', () => {
    const a = Array.from({ length: 16 }, (_, i) => i + 1);
    const b = [9];
    const expected = a.map((x) => BigInt(x * 9));
    expect(nttConvolution(a, b)).toEqual(expected);
  });

  it('matches naive on randomish ints', () => {
    const a = Array.from({ length: 30 }, () => Math.floor(Math.random() * 1000));
    const b = Array.from({ length: 25 }, () => Math.floor(Math.random() * 1000));
    expect(nttConvolution(a, b)).toEqual(naiveConv(a, b));
  });

  it('zero polynomial', () => {
    expect(nttConvolution([0, 0, 0], [1, 2, 3])).toEqual([0n, 0n, 0n, 0n, 0n]);
  });

  it('identity convolution', () => {
    expect(nttConvolution([1], [1, 2, 3, 4, 5])).toEqual([1n, 2n, 3n, 4n, 5n]);
  });

  it('handles bigint inputs', () => {
    expect(nttConvolution([1n, 2n], [3n, 4n])).toEqual([3n, 10n, 8n]);
  });

  it('large values near modulus', () => {
    const big = NTT_MODULUS - 1n;
    // (p-1)(p-1) = p^2 - 2p + 1 = 1 mod p
    expect(nttConvolution([big], [big])).toEqual([1n]);
  });

  it('commutative', () => {
    const a = [1, 2, 3, 4, 5];
    const b = [6, 7, 8];
    expect(nttConvolution(a, b)).toEqual(nttConvolution(b, a));
  });

  it('output length is a + b - 1', () => {
    expect(nttConvolution([1, 2, 3], [4, 5, 6, 7, 8]).length).toBe(7);
  });

  it('size 64 x 64 matches naive', () => {
    const a = Array.from({ length: 64 }, () => Math.floor(Math.random() * 100));
    const b = Array.from({ length: 64 }, () => Math.floor(Math.random() * 100));
    expect(nttConvolution(a, b)).toEqual(naiveConv(a, b));
  });
});
