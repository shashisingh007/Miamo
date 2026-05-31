import { describe, it, expect } from 'vitest';
import { FenwickTree2D } from '../fenwickTree2D';

describe('FenwickTree2D', () => {
  it('throws on bad dims', () => {
    expect(() => new FenwickTree2D(0, 1)).toThrow(RangeError);
    expect(() => new FenwickTree2D(1, 0)).toThrow(RangeError);
    expect(() => new FenwickTree2D(-1, 1)).toThrow(RangeError);
    expect(() => new FenwickTree2D(1.5, 1)).toThrow(RangeError);
  });

  it('empty grid prefix sum 0', () => {
    const t = new FenwickTree2D(3, 3);
    expect(t.prefixSum(2, 2)).toBe(0);
  });

  it('single update', () => {
    const t = new FenwickTree2D(3, 3);
    t.update(1, 1, 5);
    expect(t.prefixSum(1, 1)).toBe(5);
    expect(t.prefixSum(0, 0)).toBe(0);
    expect(t.prefixSum(2, 2)).toBe(5);
  });

  it('rangeSum basic', () => {
    const t = new FenwickTree2D(3, 3);
    t.update(0, 0, 1);
    t.update(1, 1, 2);
    t.update(2, 2, 3);
    expect(t.rangeSum(0, 0, 2, 2)).toBe(6);
    expect(t.rangeSum(1, 1, 2, 2)).toBe(5);
    expect(t.rangeSum(0, 0, 0, 0)).toBe(1);
  });

  it('rangeSum sub-rectangle', () => {
    const t = new FenwickTree2D(4, 4);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) t.update(i, j, 1);
    expect(t.rangeSum(0, 0, 3, 3)).toBe(16);
    expect(t.rangeSum(1, 1, 2, 2)).toBe(4);
  });

  it('delta updates accumulate', () => {
    const t = new FenwickTree2D(2, 2);
    t.update(0, 0, 5);
    t.update(0, 0, 3);
    expect(t.prefixSum(0, 0)).toBe(8);
  });

  it('negative delta', () => {
    const t = new FenwickTree2D(2, 2);
    t.update(0, 0, 10);
    t.update(0, 0, -4);
    expect(t.prefixSum(0, 0)).toBe(6);
  });

  it('throws on out-of-bounds update', () => {
    const t = new FenwickTree2D(2, 2);
    expect(() => t.update(2, 0, 1)).toThrow(RangeError);
    expect(() => t.update(0, 2, 1)).toThrow(RangeError);
    expect(() => t.update(-1, 0, 1)).toThrow(RangeError);
  });

  it('throws on out-of-bounds prefix', () => {
    const t = new FenwickTree2D(2, 2);
    expect(() => t.prefixSum(2, 0)).toThrow(RangeError);
    expect(() => t.prefixSum(0, 2)).toThrow(RangeError);
  });

  it('prefix(-1, c) and prefix(r, -1) return 0', () => {
    const t = new FenwickTree2D(2, 2);
    t.update(0, 0, 5);
    expect(t.prefixSum(-1, 1)).toBe(0);
    expect(t.prefixSum(1, -1)).toBe(0);
  });

  it('rangeSum on inverted box => 0', () => {
    const t = new FenwickTree2D(3, 3);
    t.update(1, 1, 5);
    expect(t.rangeSum(2, 2, 0, 0)).toBe(0);
  });

  it('matches naive computation', () => {
    const rows = 8, cols = 8;
    const t = new FenwickTree2D(rows, cols);
    const grid: number[][] = [];
    for (let i = 0; i < rows; i++) grid.push(new Array<number>(cols).fill(0));
    let seed = 1;
    for (let k = 0; k < 30; k++) {
      seed = (seed * 16807) % 2147483647;
      const r = seed % rows;
      seed = (seed * 16807) % 2147483647;
      const c = seed % cols;
      seed = (seed * 16807) % 2147483647;
      const v = (seed % 20) - 10;
      grid[r][c] += v;
      t.update(r, c, v);
    }
    for (let r1 = 0; r1 < rows; r1++) {
      for (let c1 = 0; c1 < cols; c1++) {
        for (let r2 = r1; r2 < rows; r2++) {
          for (let c2 = c1; c2 < cols; c2++) {
            let expected = 0;
            for (let i = r1; i <= r2; i++) for (let j = c1; j <= c2; j++) expected += grid[i][j];
            expect(t.rangeSum(r1, c1, r2, c2)).toBe(expected);
          }
        }
      }
    }
  });

  it('1x1 grid', () => {
    const t = new FenwickTree2D(1, 1);
    t.update(0, 0, 7);
    expect(t.prefixSum(0, 0)).toBe(7);
    expect(t.rangeSum(0, 0, 0, 0)).toBe(7);
  });

  it('large grid prefix sums', () => {
    const t = new FenwickTree2D(20, 20);
    for (let i = 0; i < 20; i++) t.update(i, i, 1);
    expect(t.rangeSum(0, 0, 19, 19)).toBe(20);
    expect(t.rangeSum(0, 0, 9, 9)).toBe(10);
  });
});
