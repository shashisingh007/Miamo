import { describe, it, expect } from 'vitest';
import { haarWaveletTransform, haarWaveletInverse } from '../haarWaveletTransform';

describe('haarWaveletTransform', () => {
  it('throws on empty', () => {
    expect(() => haarWaveletTransform([])).toThrow();
  });

  it('throws on non-power-of-2', () => {
    expect(() => haarWaveletTransform([1, 2, 3])).toThrow();
  });

  it('inverse throws on empty', () => {
    expect(() => haarWaveletInverse([])).toThrow();
  });

  it('inverse throws on non-power-of-2', () => {
    expect(() => haarWaveletInverse([1, 2, 3])).toThrow();
  });

  it('1-point trivially', () => {
    expect(haarWaveletTransform([5])).toEqual([5]);
    expect(haarWaveletInverse([5])).toEqual([5]);
  });

  it('N=2', () => {
    const c = haarWaveletTransform([4, 2]);
    expect(c[0]).toBeCloseTo((4 + 2) / Math.SQRT2, 10);
    expect(c[1]).toBeCloseTo((4 - 2) / Math.SQRT2, 10);
  });

  it('inverse recovers (N=4)', () => {
    const x = [1, 2, 3, 4];
    const back = haarWaveletInverse(haarWaveletTransform(x));
    for (let i = 0; i < 4; i++) expect(back[i]).toBeCloseTo(x[i], 10);
  });

  it('inverse recovers (N=8)', () => {
    const x = [1, -2, 3, 4, -5, 6, 7, -8];
    const back = haarWaveletInverse(haarWaveletTransform(x));
    for (let i = 0; i < 8; i++) expect(back[i]).toBeCloseTo(x[i], 10);
  });

  it('inverse recovers (N=16)', () => {
    const x = Array.from({ length: 16 }, (_, i) => Math.sin(i));
    const back = haarWaveletInverse(haarWaveletTransform(x));
    for (let i = 0; i < 16; i++) expect(back[i]).toBeCloseTo(x[i], 10);
  });

  it('zero input => zero output', () => {
    const c = haarWaveletTransform([0, 0, 0, 0]);
    for (const v of c) expect(Math.abs(v)).toBeLessThan(1e-12);
  });

  it('linearity', () => {
    const a = haarWaveletTransform([1, 2, 3, 4]);
    const b = haarWaveletTransform([2, 4, 6, 8]);
    for (let i = 0; i < 4; i++) expect(b[i]).toBeCloseTo(2 * a[i], 10);
  });

  it('Parseval (energy preservation)', () => {
    const x = [1, -2, 3, 4, -5, 6, 7, -8];
    const c = haarWaveletTransform(x);
    let ex = 0, ec = 0;
    for (let i = 0; i < 8; i++) { ex += x[i] * x[i]; ec += c[i] * c[i]; }
    expect(ec).toBeCloseTo(ex, 8);
  });

  it('constant signal => only scaling coefficient', () => {
    const c = haarWaveletTransform([3, 3, 3, 3]);
    expect(c[0]).toBeCloseTo(6, 8);
    for (let i = 1; i < 4; i++) expect(Math.abs(c[i])).toBeLessThan(1e-10);
  });

  it('does not mutate input', () => {
    const x = [1, 2, 3, 4];
    const ref = x.slice();
    haarWaveletTransform(x);
    expect(x).toEqual(ref);
  });

  it('output length matches input', () => {
    expect(haarWaveletTransform([1, 2, 3, 4, 5, 6, 7, 8])).toHaveLength(8);
  });

  it('inverse output length matches', () => {
    expect(haarWaveletInverse([1, 2, 3, 4])).toHaveLength(4);
  });
});
