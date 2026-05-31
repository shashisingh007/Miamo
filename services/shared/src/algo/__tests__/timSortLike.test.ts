import { describe, it, expect } from 'vitest';
import { timSortLike } from '../timSortLike';

describe('timSortLike', () => {
  it('empty', () => {
    expect(timSortLike([])).toEqual([]);
  });

  it('single', () => {
    expect(timSortLike([4])).toEqual([4]);
  });

  it('sorted', () => {
    expect(timSortLike([1, 2, 3, 4, 5])).toEqual([1, 2, 3, 4, 5]);
  });

  it('reversed', () => {
    expect(timSortLike([5, 4, 3, 2, 1])).toEqual([1, 2, 3, 4, 5]);
  });

  it('duplicates', () => {
    expect(timSortLike([3, 1, 3, 2, 1])).toEqual([1, 1, 2, 3, 3]);
  });

  it('random of 500', () => {
    const arr = Array.from({ length: 500 }, (_, i) => (i * 73) % 91);
    const expected = arr.slice().sort((a, b) => a - b);
    expect(timSortLike(arr)).toEqual(expected);
  });

  it('partially sorted with natural runs', () => {
    const arr = [1, 2, 3, 4, 5, 0, 6, 7, 8, -1];
    expect(timSortLike(arr)).toEqual([-1, 0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('descending runs are detected and reversed', () => {
    const arr = [5, 4, 3, 2, 1, 6, 7, 8, 9, 10];
    expect(timSortLike(arr)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('stable for equal keys', () => {
    const arr = [
      { k: 1, id: 'a' },
      { k: 2, id: 'b' },
      { k: 1, id: 'c' },
      { k: 2, id: 'd' },
    ];
    const sorted = timSortLike(arr, (a, b) => a.k - b.k);
    expect(sorted.map((x) => x.id)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('custom cmp descending', () => {
    expect(timSortLike([1, 5, 3], (a, b) => b - a)).toEqual([5, 3, 1]);
  });

  it('does not mutate input', () => {
    const arr = [3, 1, 2];
    timSortLike(arr);
    expect(arr).toEqual([3, 1, 2]);
  });

  it('strings', () => {
    expect(timSortLike(['banana', 'apple', 'cherry'])).toEqual(['apple', 'banana', 'cherry']);
  });
});
