import { describe, it, expect } from 'vitest';
import { SplayTreeSet } from '../splayTreeSet';

const cmp = (a: number, b: number) => a - b;

describe('SplayTreeSet', () => {
  it('empty', () => {
    const s = new SplayTreeSet<number>(cmp);
    expect(s.size()).toBe(0);
    expect(s.values()).toEqual([]);
    expect(s.has(1)).toBe(false);
  });

  it('add single', () => {
    const s = new SplayTreeSet<number>(cmp);
    expect(s.add(5)).toBe(true);
    expect(s.size()).toBe(1);
    expect(s.has(5)).toBe(true);
  });

  it('add duplicate => false', () => {
    const s = new SplayTreeSet<number>(cmp);
    s.add(5);
    expect(s.add(5)).toBe(false);
    expect(s.size()).toBe(1);
  });

  it('in-order values', () => {
    const s = new SplayTreeSet<number>(cmp);
    [5, 2, 8, 1, 3, 7, 9].forEach((v) => s.add(v));
    expect(s.values()).toEqual([1, 2, 3, 5, 7, 8, 9]);
  });

  it('delete leaf', () => {
    const s = new SplayTreeSet<number>(cmp);
    [5, 2, 8].forEach((v) => s.add(v));
    expect(s.delete(2)).toBe(true);
    expect(s.values()).toEqual([5, 8]);
    expect(s.size()).toBe(2);
  });

  it('delete missing => false', () => {
    const s = new SplayTreeSet<number>(cmp);
    s.add(5);
    expect(s.delete(7)).toBe(false);
  });

  it('delete root with both children', () => {
    const s = new SplayTreeSet<number>(cmp);
    [5, 2, 8, 1, 3, 7, 9].forEach((v) => s.add(v));
    expect(s.delete(5)).toBe(true);
    expect(s.values()).toEqual([1, 2, 3, 7, 8, 9]);
  });

  it('delete all', () => {
    const s = new SplayTreeSet<number>(cmp);
    const vals = [3, 1, 4, 1, 5, 9, 2, 6];
    vals.forEach((v) => s.add(v));
    const uniq = Array.from(new Set(vals));
    for (const v of uniq) s.delete(v);
    expect(s.size()).toBe(0);
    expect(s.values()).toEqual([]);
  });

  it('handles 500 ascending inserts', () => {
    const s = new SplayTreeSet<number>(cmp);
    for (let i = 0; i < 500; i++) s.add(i);
    expect(s.size()).toBe(500);
    expect(s.values()[499]).toBe(499);
  });

  it('handles 500 descending inserts', () => {
    const s = new SplayTreeSet<number>(cmp);
    for (let i = 500; i > 0; i--) s.add(i);
    expect(s.size()).toBe(500);
    expect(s.values()[0]).toBe(1);
  });

  it('mixed has/add/delete sequence', () => {
    const s = new SplayTreeSet<number>(cmp);
    [10, 5, 15, 3, 7, 12, 18].forEach((v) => s.add(v));
    expect(s.has(7)).toBe(true);
    expect(s.has(8)).toBe(false);
    s.delete(15);
    expect(s.values()).toEqual([3, 5, 7, 10, 12, 18]);
  });

  it('string comparator', () => {
    const s = new SplayTreeSet<string>((a, b) => a.localeCompare(b));
    ['banana', 'apple', 'cherry'].forEach((v) => s.add(v));
    expect(s.values()).toEqual(['apple', 'banana', 'cherry']);
  });

  it('size after duplicates ignored', () => {
    const s = new SplayTreeSet<number>(cmp);
    s.add(1); s.add(1); s.add(1);
    expect(s.size()).toBe(1);
  });

  it('delete preserves remaining order', () => {
    const s = new SplayTreeSet<number>(cmp);
    for (let i = 0; i < 20; i++) s.add(i);
    for (let i = 0; i < 20; i += 2) s.delete(i);
    expect(s.values()).toEqual([1, 3, 5, 7, 9, 11, 13, 15, 17, 19]);
  });
});
