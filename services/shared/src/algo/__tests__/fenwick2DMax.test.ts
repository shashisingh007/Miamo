import { describe, it, expect } from 'vitest';
import { Fenwick2DMax } from '../fenwick2DMax';

describe('Fenwick2DMax', () => {
  it('initial query returns -Infinity', () => {
    const F = new Fenwick2DMax(4, 4);
    expect(F.queryPrefixMax(4, 4)).toBe(-Infinity);
  });

  it('single update reflects in prefix', () => {
    const F = new Fenwick2DMax(5, 5);
    F.update(3, 3, 7);
    expect(F.queryPrefixMax(3, 3)).toBe(7);
    expect(F.queryPrefixMax(2, 3)).toBe(-Infinity);
    expect(F.queryPrefixMax(3, 2)).toBe(-Infinity);
    expect(F.queryPrefixMax(5, 5)).toBe(7);
  });

  it('takes maximum across multiple updates at same cell', () => {
    const F = new Fenwick2DMax(3, 3);
    F.update(2, 2, 4);
    F.update(2, 2, 9);
    F.update(2, 2, 1);
    expect(F.queryPrefixMax(2, 2)).toBe(9);
  });

  it('matches brute force on random grid', () => {
    const R = 8, C = 8;
    const F = new Fenwick2DMax(R, C);
    const G: number[][] = Array.from({ length: R + 1 }, () => new Array(C + 1).fill(-Infinity));
    for (let t = 0; t < 50; t++) {
      const r = 1 + Math.floor(Math.random() * R);
      const c = 1 + Math.floor(Math.random() * C);
      const v = Math.floor(Math.random() * 1000) - 500;
      F.update(r, c, v);
      if (v > G[r][c]) G[r][c] = v;
    }
    for (let qr = 1; qr <= R; qr++)
      for (let qc = 1; qc <= C; qc++) {
        let best = -Infinity;
        for (let i = 1; i <= qr; i++) for (let j = 1; j <= qc; j++) if (G[i][j] > best) best = G[i][j];
        expect(F.queryPrefixMax(qr, qc)).toBe(best);
      }
  });

  it('rectangular grid', () => {
    const F = new Fenwick2DMax(2, 6);
    F.update(2, 5, 11);
    expect(F.queryPrefixMax(2, 6)).toBe(11);
    expect(F.queryPrefixMax(2, 4)).toBe(-Infinity);
  });

  it('handles negative values', () => {
    const F = new Fenwick2DMax(3, 3);
    F.update(1, 1, -5);
    expect(F.queryPrefixMax(3, 3)).toBe(-5);
  });

  it('rejects non-positive dims', () => {
    expect(() => new Fenwick2DMax(0, 3)).toThrow();
    expect(() => new Fenwick2DMax(3, 0)).toThrow();
  });

  it('rejects out-of-range update', () => {
    const F = new Fenwick2DMax(2, 2);
    expect(() => F.update(0, 1, 1)).toThrow();
    expect(() => F.update(3, 1, 1)).toThrow();
    expect(() => F.update(1, 3, 1)).toThrow();
  });

  it('rejects out-of-range query', () => {
    const F = new Fenwick2DMax(2, 2);
    expect(() => F.queryPrefixMax(0, 1)).toThrow();
  });

  it('rejects non-finite update value', () => {
    const F = new Fenwick2DMax(2, 2);
    expect(() => F.update(1, 1, NaN)).toThrow();
  });

  it('point queries form a non-decreasing prefix', () => {
    const F = new Fenwick2DMax(4, 4);
    F.update(2, 2, 3);
    F.update(4, 4, 8);
    expect(F.queryPrefixMax(2, 2)).toBeLessThanOrEqual(F.queryPrefixMax(4, 4));
  });
});
