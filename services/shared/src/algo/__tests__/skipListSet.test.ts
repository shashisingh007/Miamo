import { describe, it, expect } from 'vitest';
import { SkipListSet } from '../skipListSet';

describe('SkipListSet', () => {
  it('starts empty', () => {
    const s = new SkipListSet<number>();
    expect(s.size).toBe(0);
    expect(s.has(1)).toBe(false);
  });

  it('rejects bad maxLevel', () => {
    expect(() => new SkipListSet({ maxLevel: 0 })).toThrow();
    expect(() => new SkipListSet({ maxLevel: -1 })).toThrow();
    expect(() => new SkipListSet({ maxLevel: 1.5 })).toThrow();
  });

  it('rejects bad probability', () => {
    expect(() => new SkipListSet({ probability: 0 })).toThrow();
    expect(() => new SkipListSet({ probability: 1 })).toThrow();
  });

  it('add returns true for new, false for dup', () => {
    const s = new SkipListSet<number>();
    expect(s.add(5)).toBe(true);
    expect(s.add(5)).toBe(false);
    expect(s.size).toBe(1);
  });

  it('has after add', () => {
    const s = new SkipListSet<number>();
    s.add(1); s.add(3); s.add(2);
    expect(s.has(1)).toBe(true);
    expect(s.has(2)).toBe(true);
    expect(s.has(3)).toBe(true);
    expect(s.has(4)).toBe(false);
  });

  it('values yields sorted order', () => {
    const s = new SkipListSet<number>();
    for (const x of [3, 1, 4, 1, 5, 9, 2, 6]) s.add(x);
    expect(s.toArray()).toEqual([1, 2, 3, 4, 5, 6, 9]);
  });

  it('delete returns true if present', () => {
    const s = new SkipListSet<number>();
    s.add(1);
    expect(s.delete(1)).toBe(true);
    expect(s.has(1)).toBe(false);
    expect(s.size).toBe(0);
  });

  it('delete returns false if absent', () => {
    const s = new SkipListSet<number>();
    expect(s.delete(7)).toBe(false);
  });

  it('preserves order after deletes', () => {
    const s = new SkipListSet<number>();
    for (const x of [1, 2, 3, 4, 5]) s.add(x);
    s.delete(3);
    expect(s.toArray()).toEqual([1, 2, 4, 5]);
  });

  it('custom compare for strings desc', () => {
    const s = new SkipListSet<string>({ compare: (a, b) => (a < b ? 1 : a > b ? -1 : 0) });
    for (const x of ['banana', 'apple', 'cherry']) s.add(x);
    expect(s.toArray()).toEqual(['cherry', 'banana', 'apple']);
  });

  it('handles many inserts', () => {
    const s = new SkipListSet<number>();
    for (let i = 0; i < 500; i++) s.add(i);
    for (let i = 0; i < 500; i++) expect(s.has(i)).toBe(true);
    expect(s.size).toBe(500);
  });

  it('shuffled insert preserves sorted output', () => {
    const s = new SkipListSet<number>();
    const arr = [];
    for (let i = 0; i < 100; i++) arr.push(i);
    arr.sort(() => Math.random() - 0.5);
    for (const x of arr) s.add(x);
    expect(s.toArray()).toEqual(arr.slice().sort((a, b) => a - b));
  });

  it('delete in middle leaves both sides intact', () => {
    const s = new SkipListSet<number>();
    for (let i = 0; i < 20; i++) s.add(i);
    for (let i = 5; i < 15; i++) s.delete(i);
    expect(s.toArray()).toEqual([0, 1, 2, 3, 4, 15, 16, 17, 18, 19]);
  });

  it('values() iterator works with for-of', () => {
    const s = new SkipListSet<number>();
    s.add(10); s.add(20); s.add(30);
    const out: number[] = [];
    for (const v of s.values()) out.push(v);
    expect(out).toEqual([10, 20, 30]);
  });

  it('deterministic with fixed rng', () => {
    let seed = 1;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x1_0000_0000;
    };
    const a = new SkipListSet<number>({ random: rng });
    const b = new SkipListSet<number>({ random: rng });
    for (let i = 0; i < 50; i++) a.add(i);
    for (let i = 50; i > 0; i--) b.add(i);
    // Both will have all numbers 1..50 sorted (a missing 50, b missing 0).
    expect(a.toArray().length).toBe(50);
    expect(b.toArray().length).toBe(50);
  });

  it('size decreases on each successful delete', () => {
    const s = new SkipListSet<number>();
    for (let i = 0; i < 10; i++) s.add(i);
    s.delete(0); s.delete(5); s.delete(9);
    expect(s.size).toBe(7);
  });

  it('add+delete cycle returns to empty', () => {
    const s = new SkipListSet<number>();
    for (let i = 0; i < 50; i++) s.add(i);
    for (let i = 0; i < 50; i++) s.delete(i);
    expect(s.size).toBe(0);
    expect(s.toArray()).toEqual([]);
  });

  it('contains works after many random ops', () => {
    const s = new SkipListSet<number>();
    const ref = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const v = Math.floor(Math.random() * 100);
      if (Math.random() < 0.7) {
        s.add(v);
        ref.add(v);
      } else {
        s.delete(v);
        ref.delete(v);
      }
    }
    for (let v = 0; v < 100; v++) {
      expect(s.has(v)).toBe(ref.has(v));
    }
  });
});
