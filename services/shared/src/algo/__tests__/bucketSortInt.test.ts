import { describe, it, expect } from 'vitest';
import { bucketSortInt } from '../bucketSortInt';

describe('bucketSortInt', () => {
  it('empty => empty', () => {
    expect(bucketSortInt([])).toEqual([]);
  });

  it('single element', () => {
    expect(bucketSortInt([42])).toEqual([42]);
  });

  it('sorts ascending', () => {
    expect(bucketSortInt([5, 2, 8, 1, 9, 3])).toEqual([1, 2, 3, 5, 8, 9]);
  });

  it('handles duplicates', () => {
    expect(bucketSortInt([3, 1, 3, 2, 1, 2])).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it('handles negatives', () => {
    expect(bucketSortInt([-3, 0, -1, 2, -2, 1])).toEqual([-3, -2, -1, 0, 1, 2]);
  });

  it('already sorted', () => {
    expect(bucketSortInt([1, 2, 3, 4, 5])).toEqual([1, 2, 3, 4, 5]);
  });

  it('reverse sorted', () => {
    expect(bucketSortInt([5, 4, 3, 2, 1])).toEqual([1, 2, 3, 4, 5]);
  });

  it('all same', () => {
    expect(bucketSortInt([7, 7, 7])).toEqual([7, 7, 7]);
  });

  it('throws on non-integer', () => {
    expect(() => bucketSortInt([1, 2.5, 3])).toThrow(TypeError);
  });

  it('does not mutate input', () => {
    const a = [3, 1, 2];
    const copy = [...a];
    bucketSortInt(a);
    expect(a).toEqual(copy);
  });

  it('matches Array.sort for random input', () => {
    const a = [9, -3, 7, 1, 8, -2, 5, 6, 4, 0];
    expect(bucketSortInt(a)).toEqual([...a].sort((x, y) => x - y));
  });

  it('large range single value', () => {
    expect(bucketSortInt([1000])).toEqual([1000]);
  });
});
