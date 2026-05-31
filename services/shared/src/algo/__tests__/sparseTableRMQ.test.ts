import { describe, it, expect } from 'vitest';
import { SparseTableRMQ } from '../sparseTableRMQ';

describe('SparseTableRMQ', () => {
  it('empty array allowed; rangeMin throws', () => {
    const t = new SparseTableRMQ([]);
    expect(t.size()).toBe(0);
    expect(() => t.rangeMin(0, 0)).toThrow(RangeError);
  });

  it('single element', () => {
    const t = new SparseTableRMQ([7]);
    expect(t.rangeMin(0, 0)).toBe(7);
  });

  it('basic min', () => {
    const t = new SparseTableRMQ([3, 1, 4, 1, 5, 9, 2, 6]);
    expect(t.rangeMin(0, 7)).toBe(1);
    expect(t.rangeMin(2, 5)).toBe(1);
    expect(t.rangeMin(4, 7)).toBe(2);
  });

  it('single-element range', () => {
    const t = new SparseTableRMQ([5, 2, 8]);
    expect(t.rangeMin(1, 1)).toBe(2);
  });

  it('throws invalid range', () => {
    const t = new SparseTableRMQ([1, 2, 3]);
    expect(() => t.rangeMin(-1, 1)).toThrow(RangeError);
    expect(() => t.rangeMin(0, 5)).toThrow(RangeError);
    expect(() => t.rangeMin(2, 1)).toThrow(RangeError);
  });

  it('all same values', () => {
    const t = new SparseTableRMQ([5, 5, 5, 5]);
    expect(t.rangeMin(0, 3)).toBe(5);
  });

  it('strictly increasing', () => {
    const t = new SparseTableRMQ([1, 2, 3, 4, 5]);
    expect(t.rangeMin(0, 4)).toBe(1);
    expect(t.rangeMin(2, 4)).toBe(3);
  });

  it('strictly decreasing', () => {
    const t = new SparseTableRMQ([5, 4, 3, 2, 1]);
    expect(t.rangeMin(0, 4)).toBe(1);
    expect(t.rangeMin(0, 2)).toBe(3);
  });

  it('negative values', () => {
    const t = new SparseTableRMQ([-1, -5, 3, -2]);
    expect(t.rangeMin(0, 3)).toBe(-5);
    expect(t.rangeMin(2, 3)).toBe(-2);
  });

  it('matches naive for random-ish data', () => {
    const arr = [];
    let seed = 7;
    for (let i = 0; i < 100; i++) {
      seed = (seed * 16807) % 2147483647;
      arr.push(seed % 1000);
    }
    const t = new SparseTableRMQ(arr);
    for (let l = 0; l < arr.length; l++) {
      for (let r = l; r < arr.length; r++) {
        let expected = arr[l];
        for (let i = l; i <= r; i++) if (arr[i] < expected) expected = arr[i];
        expect(t.rangeMin(l, r)).toBe(expected);
      }
    }
  });

  it('size reports length', () => {
    expect(new SparseTableRMQ([1, 2, 3]).size()).toBe(3);
  });

  it('large monotonic data', () => {
    const arr = [];
    for (let i = 0; i < 1000; i++) arr.push(i);
    const t = new SparseTableRMQ(arr);
    expect(t.rangeMin(0, 999)).toBe(0);
    expect(t.rangeMin(500, 999)).toBe(500);
  });

  it('floating-point values', () => {
    const t = new SparseTableRMQ([1.5, 2.5, 0.5, 3.5]);
    expect(t.rangeMin(0, 3)).toBe(0.5);
    expect(t.rangeMin(0, 1)).toBe(1.5);
  });

  it('does not mutate input', () => {
    const arr = [3, 1, 2];
    const t = new SparseTableRMQ(arr);
    arr[0] = 999;
    expect(t.rangeMin(0, 2)).toBe(1);
  });
});
