import { describe, it, expect } from 'vitest';
import { radixSortInt } from '../radixSortInt';

describe('radixSortInt', () => {
  it('rejects non-array', () => {
    expect(() => radixSortInt('hi' as any)).toThrow();
  });

  it('rejects non-integers', () => {
    expect(() => radixSortInt([1.5])).toThrow();
  });

  it('rejects negatives', () => {
    expect(() => radixSortInt([-1])).toThrow();
  });

  it('rejects above 2^32-1', () => {
    expect(() => radixSortInt([0x100000000])).toThrow();
  });

  it('empty', () => {
    expect(radixSortInt([])).toEqual([]);
  });

  it('single', () => {
    expect(radixSortInt([42])).toEqual([42]);
  });

  it('two reversed', () => {
    expect(radixSortInt([2, 1])).toEqual([1, 2]);
  });

  it('small set', () => {
    expect(radixSortInt([5, 2, 8, 1, 9, 3])).toEqual([1, 2, 3, 5, 8, 9]);
  });

  it('duplicates preserved', () => {
    expect(radixSortInt([3, 1, 2, 1, 3, 2])).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it('already sorted', () => {
    expect(radixSortInt([1, 2, 3, 4, 5])).toEqual([1, 2, 3, 4, 5]);
  });

  it('all zeros', () => {
    expect(radixSortInt([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it('large values', () => {
    const arr = [0xffffffff, 0, 0x80000000, 0x7fffffff];
    expect(radixSortInt(arr)).toEqual([0, 0x7fffffff, 0x80000000, 0xffffffff]);
  });

  it('does not mutate input', () => {
    const a = [3, 1, 2];
    radixSortInt(a);
    expect(a).toEqual([3, 1, 2]);
  });

  it('1k random', () => {
    const arr: number[] = [];
    for (let i = 0; i < 1000; i++) arr.push(Math.floor(Math.random() * 1e9));
    const sorted = radixSortInt(arr);
    const expected = [...arr].sort((a, b) => a - b);
    expect(sorted).toEqual(expected);
  });

  it('10k random', () => {
    const arr: number[] = [];
    for (let i = 0; i < 10000; i++) arr.push(Math.floor(Math.random() * 0xffffffff));
    const sorted = radixSortInt(arr);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i]).toBeGreaterThanOrEqual(sorted[i - 1]);
  });

  it('boundary 255/256/257', () => {
    expect(radixSortInt([257, 255, 256])).toEqual([255, 256, 257]);
  });

  it('all same value', () => {
    expect(radixSortInt([7, 7, 7, 7])).toEqual([7, 7, 7, 7]);
  });

  it('reverse sorted large', () => {
    const arr: number[] = [];
    for (let i = 1000; i > 0; i--) arr.push(i);
    const sorted = radixSortInt(arr);
    for (let i = 0; i < 1000; i++) expect(sorted[i]).toBe(i + 1);
  });

  it('returns array (not typed array)', () => {
    expect(Array.isArray(radixSortInt([3, 1, 2]))).toBe(true);
  });

  it('stable for duplicates by value', () => {
    const sorted = radixSortInt([5, 1, 5, 1, 5, 1]);
    expect(sorted).toEqual([1, 1, 1, 5, 5, 5]);
  });
});
