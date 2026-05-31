import { describe, it, expect } from 'vitest';
import { createTreapOrderedSet } from '../treapOrderedSet';

const numCmp = (a: number, b: number): number => a - b;

describe('treapOrderedSet', () => {
  it('starts empty', () => {
    const s = createTreapOrderedSet<number>(numCmp);
    expect(s.size()).toBe(0);
    expect(s.values()).toEqual([]);
  });

  it('add returns true on insert, false on duplicate', () => {
    const s = createTreapOrderedSet<number>(numCmp);
    expect(s.add(5)).toBe(true);
    expect(s.add(5)).toBe(false);
    expect(s.size()).toBe(1);
  });

  it('has returns true after add', () => {
    const s = createTreapOrderedSet<number>(numCmp);
    s.add(7);
    expect(s.has(7)).toBe(true);
    expect(s.has(8)).toBe(false);
  });

  it('values are sorted ascending', () => {
    const s = createTreapOrderedSet<number>(numCmp);
    [5, 1, 3, 2, 4].forEach((v) => s.add(v));
    expect(s.values()).toEqual([1, 2, 3, 4, 5]);
  });

  it('delete removes element', () => {
    const s = createTreapOrderedSet<number>(numCmp);
    [1, 2, 3].forEach((v) => s.add(v));
    expect(s.delete(2)).toBe(true);
    expect(s.values()).toEqual([1, 3]);
    expect(s.size()).toBe(2);
  });

  it('delete returns false when missing', () => {
    const s = createTreapOrderedSet<number>(numCmp);
    s.add(1);
    expect(s.delete(99)).toBe(false);
  });

  it('rank gives count of elements strictly less', () => {
    const s = createTreapOrderedSet<number>(numCmp);
    [10, 20, 30, 40, 50].forEach((v) => s.add(v));
    expect(s.rank(10)).toBe(0);
    expect(s.rank(25)).toBe(2);
    expect(s.rank(50)).toBe(4);
    expect(s.rank(99)).toBe(5);
  });

  it('kth returns kth smallest (0-indexed)', () => {
    const s = createTreapOrderedSet<number>(numCmp);
    [10, 20, 30, 40, 50].forEach((v) => s.add(v));
    expect(s.kth(0)).toBe(10);
    expect(s.kth(2)).toBe(30);
    expect(s.kth(4)).toBe(50);
    expect(s.kth(5)).toBe(undefined);
  });

  it('handles random inserts/deletes preserves sorted order', () => {
    const s = createTreapOrderedSet<number>(numCmp);
    const seen = new Set<number>();
    for (let i = 0; i < 100; i++) {
      const v = Math.floor(Math.random() * 200);
      s.add(v);
      seen.add(v);
    }
    const expected = [...seen].sort((a, b) => a - b);
    expect(s.values()).toEqual(expected);
    expect(s.size()).toBe(expected.length);
  });

  it('size shrinks on delete', () => {
    const s = createTreapOrderedSet<number>(numCmp);
    for (let i = 0; i < 50; i++) s.add(i);
    for (let i = 0; i < 25; i++) s.delete(i);
    expect(s.size()).toBe(25);
  });

  it('supports custom comparator (descending)', () => {
    const desc = createTreapOrderedSet<number>((a, b) => b - a);
    [1, 2, 3].forEach((v) => desc.add(v));
    expect(desc.values()).toEqual([3, 2, 1]);
  });

  it('works with strings', () => {
    const s = createTreapOrderedSet<string>((a, b) => a.localeCompare(b));
    ['banana', 'apple', 'cherry'].forEach((v) => s.add(v));
    expect(s.values()).toEqual(['apple', 'banana', 'cherry']);
  });

  it('deterministic with fixed rng', () => {
    let i = 0;
    const rng = () => { i += 1; return (i * 13) % 97 / 97; };
    const s = createTreapOrderedSet<number>(numCmp, rng);
    for (let v = 1; v <= 20; v++) s.add(v);
    expect(s.values()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it('delete all leaves empty', () => {
    const s = createTreapOrderedSet<number>(numCmp);
    [1, 2, 3, 4, 5].forEach((v) => s.add(v));
    [1, 2, 3, 4, 5].forEach((v) => s.delete(v));
    expect(s.size()).toBe(0);
    expect(s.values()).toEqual([]);
  });

  it('kth on empty returns undefined', () => {
    const s = createTreapOrderedSet<number>(numCmp);
    expect(s.kth(0)).toBe(undefined);
  });

  it('rank on empty returns 0', () => {
    const s = createTreapOrderedSet<number>(numCmp);
    expect(s.rank(5)).toBe(0);
  });

  it('large insert stress', () => {
    const s = createTreapOrderedSet<number>(numCmp);
    for (let i = 0; i < 1000; i++) s.add(i);
    expect(s.size()).toBe(1000);
    expect(s.kth(500)).toBe(500);
  });
});
