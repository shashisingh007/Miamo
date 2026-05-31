import { describe, it, expect } from 'vitest';
import { mergeSortBottomUp } from '../mergeSortBottomUp';

describe('mergeSortBottomUp', () => {
  it('empty input', () => {
    expect(mergeSortBottomUp<number>([])).toEqual([]);
  });

  it('single element', () => {
    expect(mergeSortBottomUp([7])).toEqual([7]);
  });

  it('already sorted', () => {
    expect(mergeSortBottomUp([1, 2, 3, 4, 5])).toEqual([1, 2, 3, 4, 5]);
  });

  it('reverse sorted', () => {
    expect(mergeSortBottomUp([5, 4, 3, 2, 1])).toEqual([1, 2, 3, 4, 5]);
  });

  it('random', () => {
    expect(mergeSortBottomUp([3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5])).toEqual([
      1, 1, 2, 3, 3, 4, 5, 5, 5, 6, 9,
    ]);
  });

  it('duplicates', () => {
    expect(mergeSortBottomUp([2, 2, 2, 2])).toEqual([2, 2, 2, 2]);
  });

  it('does not mutate input', () => {
    const input = [3, 1, 2];
    const copy = input.slice();
    mergeSortBottomUp(input);
    expect(input).toEqual(copy);
  });

  it('strings default comparator', () => {
    expect(mergeSortBottomUp(['banana', 'apple', 'cherry'])).toEqual(['apple', 'banana', 'cherry']);
  });

  it('custom comparator (reverse)', () => {
    expect(mergeSortBottomUp([1, 4, 2, 3], (a, b) => b - a)).toEqual([4, 3, 2, 1]);
  });

  it('large random matches Array.sort', () => {
    const arr = Array.from({ length: 200 }, (_, i) => ((i * 37) % 113) - 50);
    const expected = arr.slice().sort((a, b) => a - b);
    expect(mergeSortBottomUp(arr)).toEqual(expected);
  });

  it('stable for equal keys', () => {
    const arr = [
      { k: 1, id: 'a' },
      { k: 2, id: 'b' },
      { k: 1, id: 'c' },
      { k: 2, id: 'd' },
    ];
    const out = mergeSortBottomUp(arr, (x, y) => x.k - y.k);
    expect(out.map((x) => x.id)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('two elements swap', () => {
    expect(mergeSortBottomUp([2, 1])).toEqual([1, 2]);
  });

  it('three elements rotated', () => {
    expect(mergeSortBottomUp([3, 1, 2])).toEqual([1, 2, 3]);
  });
});
