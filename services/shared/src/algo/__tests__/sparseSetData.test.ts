import { describe, it, expect } from 'vitest';
import { SparseSet } from '../sparseSetData';

describe('SparseSet', () => {
  it('starts empty', () => {
    const s = new SparseSet(10);
    expect(s.size()).toBe(0);
    expect(s.values()).toEqual([]);
  });

  it('add then has', () => {
    const s = new SparseSet(10);
    expect(s.add(3)).toBe(true);
    expect(s.has(3)).toBe(true);
    expect(s.has(4)).toBe(false);
    expect(s.size()).toBe(1);
  });

  it('add duplicate returns false', () => {
    const s = new SparseSet(10);
    s.add(3);
    expect(s.add(3)).toBe(false);
    expect(s.size()).toBe(1);
  });

  it('delete returns true when present', () => {
    const s = new SparseSet(10);
    s.add(2);
    s.add(5);
    expect(s.delete(2)).toBe(true);
    expect(s.has(2)).toBe(false);
    expect(s.has(5)).toBe(true);
    expect(s.size()).toBe(1);
  });

  it('delete absent returns false', () => {
    const s = new SparseSet(10);
    expect(s.delete(7)).toBe(false);
  });

  it('values reflects insertion order initially', () => {
    const s = new SparseSet(10);
    [4, 1, 9, 2].forEach((x) => s.add(x));
    expect(s.values()).toEqual([4, 1, 9, 2]);
  });

  it('clear resets', () => {
    const s = new SparseSet(10);
    [1, 2, 3].forEach((x) => s.add(x));
    s.clear();
    expect(s.size()).toBe(0);
    expect(s.has(1)).toBe(false);
  });

  it('out-of-range add throws', () => {
    const s = new SparseSet(5);
    expect(() => s.add(5)).toThrow();
    expect(() => s.add(-1)).toThrow();
  });

  it('out-of-range has returns false', () => {
    const s = new SparseSet(5);
    expect(s.has(99)).toBe(false);
    expect(s.has(-1)).toBe(false);
  });

  it('negative capacity throws', () => {
    expect(() => new SparseSet(-1)).toThrow();
  });

  it('add/delete/add cycle works', () => {
    const s = new SparseSet(10);
    s.add(3);
    s.delete(3);
    expect(s.add(3)).toBe(true);
    expect(s.has(3)).toBe(true);
  });
});
