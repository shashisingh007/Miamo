import { describe, it, expect } from 'vitest';
import { FenwickPointMax } from '../fenwickPointMax';

describe('FenwickPointMax', () => {
  it('empty prefix returns identity', () => {
    const f = new FenwickPointMax(5);
    expect(f.prefixMax(4)).toBe(-Infinity);
  });

  it('size accessor', () => {
    expect(new FenwickPointMax(7).size()).toBe(7);
  });

  it('single update', () => {
    const f = new FenwickPointMax(5);
    f.update(2, 10);
    expect(f.prefixMax(2)).toBe(10);
    expect(f.prefixMax(4)).toBe(10);
    expect(f.prefixMax(1)).toBe(-Infinity);
  });

  it('multiple updates take max', () => {
    const f = new FenwickPointMax(5);
    f.update(0, 3);
    f.update(2, 7);
    f.update(4, 5);
    expect(f.prefixMax(0)).toBe(3);
    expect(f.prefixMax(1)).toBe(3);
    expect(f.prefixMax(2)).toBe(7);
    expect(f.prefixMax(4)).toBe(7);
  });

  it('repeated update only grows', () => {
    const f = new FenwickPointMax(5);
    f.update(2, 5);
    f.update(2, 8);
    f.update(2, 3); // ignored (smaller)
    expect(f.prefixMax(2)).toBe(8);
  });

  it('out-of-bounds update throws', () => {
    const f = new FenwickPointMax(3);
    expect(() => f.update(3, 1)).toThrow();
    expect(() => f.update(-1, 1)).toThrow();
  });

  it('out-of-bounds prefixMax throws', () => {
    const f = new FenwickPointMax(3);
    expect(() => f.prefixMax(3)).toThrow();
    expect(() => f.prefixMax(-1)).toThrow();
  });

  it('negative size throws', () => {
    expect(() => new FenwickPointMax(-1)).toThrow();
  });

  it('matches naive over many updates', () => {
    const n = 50;
    const f = new FenwickPointMax(n);
    const naive = new Array<number>(n).fill(-Infinity);
    let s = 1;
    for (let k = 0; k < 200; k++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const idx = s % n;
      const val = (s >>> 4) % 1000;
      f.update(idx, val);
      if (naive[idx] < val) naive[idx] = val;
      const pidx = (s >>> 8) % n;
      let exp = -Infinity;
      for (let i = 0; i <= pidx; i++) if (naive[i] > exp) exp = naive[i];
      expect(f.prefixMax(pidx)).toBe(exp);
    }
  });

  it('custom identity is honored', () => {
    const f = new FenwickPointMax(3, 0);
    expect(f.prefixMax(2)).toBe(0);
  });

  it('identity remains when only smaller updates ignored', () => {
    const f = new FenwickPointMax(3, 100);
    f.update(0, 50); // 50 < 100, but this BIT permits any update; tree stores 100 already
    expect(f.prefixMax(0)).toBe(100);
  });
});
