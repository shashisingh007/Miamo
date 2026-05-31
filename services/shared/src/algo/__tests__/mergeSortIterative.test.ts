import { describe, it, expect } from 'vitest';
import { mergeSortIterative } from '../mergeSortIterative';

describe('mergeSortIterative', () => {
  it('empty', () => {
    expect(mergeSortIterative([])).toEqual([]);
  });

  it('single', () => {
    expect(mergeSortIterative([5])).toEqual([5]);
  });

  it('sorted', () => {
    expect(mergeSortIterative([1, 2, 3, 4, 5])).toEqual([1, 2, 3, 4, 5]);
  });

  it('reverse', () => {
    expect(mergeSortIterative([5, 4, 3, 2, 1])).toEqual([1, 2, 3, 4, 5]);
  });

  it('duplicates', () => {
    expect(mergeSortIterative([3, 1, 3, 2, 1])).toEqual([1, 1, 2, 3, 3]);
  });

  it('random', () => {
    const arr = Array.from({ length: 100 }, (_, i) => (i * 37) % 41);
    const expected = arr.slice().sort((a, b) => a - b);
    expect(mergeSortIterative(arr)).toEqual(expected);
  });

  it('strings with default cmp', () => {
    expect(mergeSortIterative(['banana', 'apple', 'cherry'])).toEqual(['apple', 'banana', 'cherry']);
  });

  it('custom cmp (descending)', () => {
    expect(mergeSortIterative([1, 5, 3], (a, b) => b - a)).toEqual([5, 3, 1]);
  });

  it('does not mutate input', () => {
    const arr = [3, 1, 2];
    mergeSortIterative(arr);
    expect(arr).toEqual([3, 1, 2]);
  });

  it('stable for equal keys', () => {
    const arr = [
      { k: 1, id: 'a' },
      { k: 2, id: 'b' },
      { k: 1, id: 'c' },
      { k: 2, id: 'd' },
    ];
    const sorted = mergeSortIterative(arr, (a, b) => a.k - b.k);
    expect(sorted.map((x) => x.id)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('odd length', () => {
    expect(mergeSortIterative([7, 2, 5, 1, 9, 3, 4])).toEqual([1, 2, 3, 4, 5, 7, 9]);
  });
});
