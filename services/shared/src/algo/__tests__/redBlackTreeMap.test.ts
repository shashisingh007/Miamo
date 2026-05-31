import { describe, it, expect } from 'vitest';
import { RedBlackTreeMap } from '../redBlackTreeMap';

const cmp = (a: number, b: number) => a - b;

describe('RedBlackTreeMap', () => {
  it('empty', () => {
    const t = new RedBlackTreeMap<number, string>(cmp);
    expect(t.size()).toBe(0);
    expect(t.has(1)).toBe(false);
    expect(t.get(1)).toBeUndefined();
  });

  it('set single', () => {
    const t = new RedBlackTreeMap<number, string>(cmp);
    t.set(5, 'five');
    expect(t.size()).toBe(1);
    expect(t.get(5)).toBe('five');
  });

  it('set overrides existing', () => {
    const t = new RedBlackTreeMap<number, string>(cmp);
    t.set(5, 'a');
    t.set(5, 'b');
    expect(t.size()).toBe(1);
    expect(t.get(5)).toBe('b');
  });

  it('keys in order', () => {
    const t = new RedBlackTreeMap<number, string>(cmp);
    [5, 1, 7, 3, 9, 2].forEach((k) => t.set(k, String(k)));
    expect(t.keys()).toEqual([1, 2, 3, 5, 7, 9]);
  });

  it('values in key order', () => {
    const t = new RedBlackTreeMap<number, string>(cmp);
    [3, 1, 2].forEach((k) => t.set(k, `v${k}`));
    expect(t.values()).toEqual(['v1', 'v2', 'v3']);
  });

  it('has returns true/false', () => {
    const t = new RedBlackTreeMap<number, string>(cmp);
    t.set(5, 'x');
    expect(t.has(5)).toBe(true);
    expect(t.has(6)).toBe(false);
  });

  it('ascending inserts 500', () => {
    const t = new RedBlackTreeMap<number, number>(cmp);
    for (let i = 0; i < 500; i++) t.set(i, i * 2);
    expect(t.size()).toBe(500);
    expect(t.get(499)).toBe(998);
    expect(t.keys()[0]).toBe(0);
    expect(t.keys()[499]).toBe(499);
  });

  it('descending inserts 500', () => {
    const t = new RedBlackTreeMap<number, number>(cmp);
    for (let i = 500; i > 0; i--) t.set(i, i);
    expect(t.size()).toBe(500);
    expect(t.keys()[0]).toBe(1);
    expect(t.keys()[499]).toBe(500);
  });

  it('random inserts produce sorted keys', () => {
    const t = new RedBlackTreeMap<number, number>(cmp);
    const data = [42, 17, 99, 3, 56, 78, 21, 8, 34, 65];
    data.forEach((k) => t.set(k, k));
    expect(t.keys()).toEqual([...data].sort((a, b) => a - b));
  });

  it('string comparator', () => {
    const t = new RedBlackTreeMap<string, number>((a, b) => a.localeCompare(b));
    ['banana', 'apple', 'cherry'].forEach((k, i) => t.set(k, i));
    expect(t.keys()).toEqual(['apple', 'banana', 'cherry']);
  });

  it('size counts unique keys only', () => {
    const t = new RedBlackTreeMap<number, number>(cmp);
    t.set(1, 1); t.set(1, 2); t.set(1, 3);
    expect(t.size()).toBe(1);
  });

  it('preserves order under heavy random workload', () => {
    const t = new RedBlackTreeMap<number, number>(cmp);
    const inserted: number[] = [];
    let seed = 12345;
    for (let i = 0; i < 200; i++) {
      seed = (seed * 16807) % 2147483647;
      const k = seed % 1000;
      if (!t.has(k)) inserted.push(k);
      t.set(k, k);
    }
    inserted.sort((a, b) => a - b);
    expect(t.keys()).toEqual(inserted);
  });

  it('get on missing key => undefined', () => {
    const t = new RedBlackTreeMap<number, string>(cmp);
    t.set(1, 'a');
    expect(t.get(999)).toBeUndefined();
  });

  it('handles 1000 ascending', () => {
    const t = new RedBlackTreeMap<number, number>(cmp);
    for (let i = 0; i < 1000; i++) t.set(i, i);
    expect(t.size()).toBe(1000);
    expect(t.keys()[999]).toBe(999);
  });
});
