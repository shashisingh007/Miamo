import { describe, it, expect } from 'vitest';
import { introSort } from '../introSort';

describe('introSort', () => {
  it('empty', () => {
    expect(introSort([])).toEqual([]);
  });

  it('single', () => {
    expect(introSort([3])).toEqual([3]);
  });

  it('two', () => {
    expect(introSort([2, 1])).toEqual([1, 2]);
  });

  it('sorted', () => {
    expect(introSort([1, 2, 3, 4, 5])).toEqual([1, 2, 3, 4, 5]);
  });

  it('reversed', () => {
    expect(introSort([5, 4, 3, 2, 1])).toEqual([1, 2, 3, 4, 5]);
  });

  it('duplicates', () => {
    expect(introSort([3, 1, 3, 1, 2])).toEqual([1, 1, 2, 3, 3]);
  });

  it('random of 200', () => {
    const arr = Array.from({ length: 200 }, (_, i) => (i * 91) % 47);
    const expected = arr.slice().sort((a, b) => a - b);
    expect(introSort(arr)).toEqual(expected);
  });

  it('all equal', () => {
    expect(introSort([7, 7, 7, 7])).toEqual([7, 7, 7, 7]);
  });

  it('triggers heapsort depth fallback on pathological input', () => {
    // 1000-element input
    const arr = Array.from({ length: 1000 }, (_, i) => i);
    const expected = arr.slice();
    expect(introSort(arr.reverse())).toEqual(expected);
  });

  it('custom comparator descending', () => {
    expect(introSort([1, 3, 2], (a, b) => b - a)).toEqual([3, 2, 1]);
  });

  it('does not mutate input', () => {
    const arr = [3, 1, 2];
    introSort(arr);
    expect(arr).toEqual([3, 1, 2]);
  });

  it('strings with default cmp', () => {
    expect(introSort(['c', 'a', 'b'])).toEqual(['a', 'b', 'c']);
  });
});
