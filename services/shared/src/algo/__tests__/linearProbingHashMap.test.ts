import { describe, it, expect } from 'vitest';
import { LinearProbingHashMap } from '../linearProbingHashMap';

describe('LinearProbingHashMap', () => {
  it('rejects bad capacity', () => {
    expect(() => new LinearProbingHashMap(0)).toThrow();
    expect(() => new LinearProbingHashMap(-1)).toThrow();
    expect(() => new LinearProbingHashMap(1.5)).toThrow();
  });

  it('empty get returns undefined', () => {
    const m = new LinearProbingHashMap<number>();
    expect(m.get('x')).toBeUndefined();
  });

  it('set then get', () => {
    const m = new LinearProbingHashMap<number>();
    m.set('a', 1);
    expect(m.get('a')).toBe(1);
  });

  it('overwrites existing', () => {
    const m = new LinearProbingHashMap<number>();
    m.set('a', 1);
    m.set('a', 2);
    expect(m.get('a')).toBe(2);
    expect(m.size).toBe(1);
  });

  it('rejects non-string key on set', () => {
    const m = new LinearProbingHashMap<number>();
    expect(() => m.set(1 as any, 1)).toThrow();
  });

  it('rejects non-string key on get', () => {
    const m = new LinearProbingHashMap<number>();
    expect(() => m.get(1 as any)).toThrow();
  });

  it('rejects non-string key on delete', () => {
    const m = new LinearProbingHashMap<number>();
    expect(() => m.delete(1 as any)).toThrow();
  });

  it('size tracks inserts', () => {
    const m = new LinearProbingHashMap<number>();
    m.set('a', 1); m.set('b', 2); m.set('c', 3);
    expect(m.size).toBe(3);
  });

  it('has', () => {
    const m = new LinearProbingHashMap<number>();
    m.set('a', 1);
    expect(m.has('a')).toBe(true);
    expect(m.has('b')).toBe(false);
  });

  it('delete returns true if present', () => {
    const m = new LinearProbingHashMap<number>();
    m.set('a', 1);
    expect(m.delete('a')).toBe(true);
    expect(m.has('a')).toBe(false);
    expect(m.size).toBe(0);
  });

  it('delete returns false if absent', () => {
    const m = new LinearProbingHashMap<number>();
    expect(m.delete('a')).toBe(false);
  });

  it('reinsert after delete works', () => {
    const m = new LinearProbingHashMap<number>();
    m.set('a', 1);
    m.delete('a');
    m.set('a', 99);
    expect(m.get('a')).toBe(99);
  });

  it('resizes past initial capacity', () => {
    const m = new LinearProbingHashMap<number>(8);
    for (let i = 0; i < 1000; i++) m.set('k-' + i, i);
    for (let i = 0; i < 1000; i++) expect(m.get('k-' + i)).toBe(i);
    expect(m.size).toBe(1000);
    expect(m.capacity).toBeGreaterThan(8);
  });

  it('keys/values/entries', () => {
    const m = new LinearProbingHashMap<number>();
    m.set('a', 1); m.set('b', 2);
    expect(m.keys().sort()).toEqual(['a', 'b']);
    expect(m.values().sort()).toEqual([1, 2]);
    expect(m.entries().length).toBe(2);
  });

  it('clear resets', () => {
    const m = new LinearProbingHashMap<number>();
    m.set('a', 1); m.set('b', 2);
    m.clear();
    expect(m.size).toBe(0);
    expect(m.get('a')).toBeUndefined();
  });

  it('handles collisions correctly', () => {
    const m = new LinearProbingHashMap<number>(8);
    for (let i = 0; i < 100; i++) m.set('x' + i, i);
    for (let i = 0; i < 100; i++) expect(m.get('x' + i)).toBe(i);
  });

  it('lookup past tombstone still finds entry', () => {
    const m = new LinearProbingHashMap<number>(8);
    for (let i = 0; i < 50; i++) m.set('item-' + i, i);
    m.delete('item-10');
    for (let i = 0; i < 50; i++) {
      if (i === 10) expect(m.get('item-' + i)).toBeUndefined();
      else expect(m.get('item-' + i)).toBe(i);
    }
  });

  it('preserves capacity as power of two', () => {
    const m = new LinearProbingHashMap<number>(13);
    expect((m.capacity & (m.capacity - 1)) === 0).toBe(true);
  });

  it('stores complex values', () => {
    const m = new LinearProbingHashMap<{ x: number }>();
    m.set('a', { x: 1 });
    expect(m.get('a')).toEqual({ x: 1 });
  });

  it('empty string key works', () => {
    const m = new LinearProbingHashMap<number>();
    m.set('', 42);
    expect(m.get('')).toBe(42);
  });
});
