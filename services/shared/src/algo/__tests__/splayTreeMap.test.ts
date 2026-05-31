import { describe, it, expect } from 'vitest';
import { SplayTreeMap } from '../splayTreeMap';

describe('SplayTreeMap', () => {
  it('empty has size 0', () => {
    const m = new SplayTreeMap<number, string>();
    expect(m.size).toBe(0);
    expect(m.get(1)).toBeUndefined();
    expect(m.has(1)).toBe(false);
  });

  it('set + get', () => {
    const m = new SplayTreeMap<number, string>();
    m.set(5, 'five');
    expect(m.get(5)).toBe('five');
    expect(m.size).toBe(1);
  });

  it('set updates existing', () => {
    const m = new SplayTreeMap<number, string>();
    m.set(5, 'a');
    m.set(5, 'b');
    expect(m.get(5)).toBe('b');
    expect(m.size).toBe(1);
  });

  it('has returns correctly', () => {
    const m = new SplayTreeMap<number, string>();
    m.set(3, 'x');
    expect(m.has(3)).toBe(true);
    expect(m.has(4)).toBe(false);
  });

  it('multiple inserts maintain BST property', () => {
    const m = new SplayTreeMap<number, number>();
    [5, 2, 8, 1, 7, 3, 9, 6, 4].forEach((k) => m.set(k, k * 10));
    expect(m.size).toBe(9);
    expect(m.keys()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const k of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      expect(m.get(k)).toBe(k * 10);
    }
  });

  it('delete removes', () => {
    const m = new SplayTreeMap<number, number>();
    [5, 2, 8, 1, 7, 3, 9].forEach((k) => m.set(k, k));
    expect(m.delete(5)).toBe(true);
    expect(m.has(5)).toBe(false);
    expect(m.size).toBe(6);
    expect(m.keys()).toEqual([1, 2, 3, 7, 8, 9]);
  });

  it('delete missing returns false', () => {
    const m = new SplayTreeMap<number, number>();
    m.set(1, 1);
    expect(m.delete(99)).toBe(false);
    expect(m.size).toBe(1);
  });

  it('delete on empty returns false', () => {
    const m = new SplayTreeMap<number, number>();
    expect(m.delete(1)).toBe(false);
  });

  it('delete only node', () => {
    const m = new SplayTreeMap<number, number>();
    m.set(7, 7);
    expect(m.delete(7)).toBe(true);
    expect(m.size).toBe(0);
    expect(m.has(7)).toBe(false);
  });

  it('custom comparator (reverse)', () => {
    const m = new SplayTreeMap<number, string>((a, b) => b - a);
    [1, 2, 3, 4].forEach((k) => m.set(k, `v${k}`));
    expect(m.keys()).toEqual([4, 3, 2, 1]);
  });

  it('string keys', () => {
    const m = new SplayTreeMap<string, number>();
    ['cherry', 'apple', 'banana'].forEach((k, i) => m.set(k, i));
    expect(m.keys()).toEqual(['apple', 'banana', 'cherry']);
  });

  it('many inserts and queries', () => {
    const m = new SplayTreeMap<number, number>();
    for (let i = 0; i < 200; i += 1) m.set(i, i);
    for (let i = 0; i < 200; i += 1) expect(m.get(i)).toBe(i);
    expect(m.size).toBe(200);
  });

  it('repeated splay does not corrupt', () => {
    const m = new SplayTreeMap<number, number>();
    [10, 5, 15, 3, 7, 12, 20].forEach((k) => m.set(k, k));
    for (let i = 0; i < 50; i += 1) m.get(15);
    for (let i = 0; i < 50; i += 1) m.get(3);
    expect(m.keys()).toEqual([3, 5, 7, 10, 12, 15, 20]);
  });
});
