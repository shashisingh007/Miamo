import { describe, it, expect } from 'vitest';
import { FenwickTreeSumRange } from '../fenwickTreeSumRange';

describe('FenwickTreeSumRange', () => {
  it('size constructor zeros', () => {
    const t = new FenwickTreeSumRange(5);
    expect(t.size).toBe(5);
    expect(t.prefixSum(5)).toBe(0);
  });

  it('values constructor seeds correctly', () => {
    const t = new FenwickTreeSumRange([1, 2, 3, 4, 5]);
    expect(t.prefixSum(5)).toBe(15);
    expect(t.prefixSum(3)).toBe(6);
  });

  it('rangeSum across arbitrary ranges', () => {
    const t = new FenwickTreeSumRange([1, 2, 3, 4, 5]);
    expect(t.rangeSum(1, 4)).toBe(9);
    expect(t.rangeSum(0, 1)).toBe(1);
    expect(t.rangeSum(0, 5)).toBe(15);
  });

  it('empty range sum = 0', () => {
    const t = new FenwickTreeSumRange([1, 2, 3]);
    expect(t.rangeSum(2, 2)).toBe(0);
  });

  it('point add updates sums', () => {
    const t = new FenwickTreeSumRange([1, 2, 3, 4, 5]);
    t.add(2, 10);
    expect(t.prefixSum(5)).toBe(25);
    expect(t.get(2)).toBe(13);
  });

  it('set replaces value', () => {
    const t = new FenwickTreeSumRange([1, 2, 3, 4, 5]);
    t.set(0, 100);
    expect(t.get(0)).toBe(100);
    expect(t.prefixSum(5)).toBe(114);
  });

  it('negative deltas allowed', () => {
    const t = new FenwickTreeSumRange([5, 5, 5]);
    t.add(1, -3);
    expect(t.rangeSum(0, 3)).toBe(12);
  });

  it('size constructor accepts 0', () => {
    const t = new FenwickTreeSumRange(0);
    expect(t.prefixSum(0)).toBe(0);
  });

  it('rejects negative size', () => {
    expect(() => new FenwickTreeSumRange(-1)).toThrow();
  });

  it('rejects non-integer size', () => {
    expect(() => new FenwickTreeSumRange(1.5)).toThrow();
  });

  it('rejects non-finite seed values', () => {
    expect(() => new FenwickTreeSumRange([1, NaN])).toThrow();
  });

  it('add rejects bad index', () => {
    const t = new FenwickTreeSumRange(3);
    expect(() => t.add(3, 1)).toThrow();
    expect(() => t.add(-1, 1)).toThrow();
    expect(() => t.add(1.5, 1)).toThrow();
  });

  it('add rejects non-finite delta', () => {
    const t = new FenwickTreeSumRange(3);
    expect(() => t.add(0, NaN)).toThrow();
  });

  it('prefixSum rejects out-of-bounds', () => {
    const t = new FenwickTreeSumRange(3);
    expect(() => t.prefixSum(4)).toThrow();
    expect(() => t.prefixSum(-1)).toThrow();
  });

  it('rangeSum rejects inverted range', () => {
    const t = new FenwickTreeSumRange(3);
    expect(() => t.rangeSum(2, 1)).toThrow();
  });

  it('get/set round-trip', () => {
    const t = new FenwickTreeSumRange([10, 20, 30]);
    t.set(1, 50);
    expect(t.get(1)).toBe(50);
    expect(t.prefixSum(3)).toBe(90);
  });

  it('handles large array efficiently', () => {
    const values = new Array(10_000).fill(1);
    const t = new FenwickTreeSumRange(values);
    expect(t.prefixSum(10_000)).toBe(10_000);
    for (let i = 0; i < 100; i++) t.add(i * 100, 5);
    expect(t.prefixSum(10_000)).toBe(10_500);
  });

  it('floating point sums preserved within precision', () => {
    const t = new FenwickTreeSumRange([0.1, 0.2, 0.3]);
    expect(t.prefixSum(3)).toBeCloseTo(0.6, 10);
  });

  it('matches naive cumulative after many ops', () => {
    const n = 200;
    const arr = new Array(n).fill(0);
    const t = new FenwickTreeSumRange(n);
    for (let i = 0; i < 500; i++) {
      const idx = (i * 7) % n;
      const v = ((i * 13) % 9) - 4;
      arr[idx] += v;
      t.add(idx, v);
    }
    let expected = 0;
    for (let i = 0; i < n; i++) expected += arr[i];
    expect(t.prefixSum(n)).toBeCloseTo(expected, 6);
  });
});
