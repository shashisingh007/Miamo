import { describe, it, expect } from 'vitest';
import { LfuCache } from '../lfuCache';

describe('LfuCache', () => {
  it('throws on non-positive capacity', () => {
    expect(() => new LfuCache<number, number>(0)).toThrow(RangeError);
    expect(() => new LfuCache<number, number>(-1)).toThrow(RangeError);
  });

  it('throws on non-integer capacity', () => {
    expect(() => new LfuCache<number, number>(1.5)).toThrow(RangeError);
  });

  it('empty cache returns undefined', () => {
    const c = new LfuCache<number, string>(3);
    expect(c.get(1)).toBeUndefined();
    expect(c.has(1)).toBe(false);
    expect(c.size).toBe(0);
  });

  it('set + get', () => {
    const c = new LfuCache<number, string>(3);
    c.set(1, 'a');
    expect(c.get(1)).toBe('a');
    expect(c.size).toBe(1);
  });

  it('update existing key', () => {
    const c = new LfuCache<number, string>(3);
    c.set(1, 'a');
    c.set(1, 'b');
    expect(c.get(1)).toBe('b');
    expect(c.size).toBe(1);
  });

  it('evicts least frequent', () => {
    const c = new LfuCache<number, string>(2);
    c.set(1, 'a');
    c.set(2, 'b');
    c.get(1);
    c.get(1);
    c.get(2);
    c.set(3, 'c');
    expect(c.has(2)).toBe(false);
    expect(c.has(1)).toBe(true);
    expect(c.has(3)).toBe(true);
  });

  it('ties evict oldest at that freq', () => {
    const c = new LfuCache<number, string>(3);
    c.set(1, 'a');
    c.set(2, 'b');
    c.set(3, 'c');
    c.set(4, 'd');
    expect(c.has(1)).toBe(false);
    expect(c.size).toBe(3);
  });

  it('get bumps frequency', () => {
    const c = new LfuCache<number, string>(2);
    c.set(1, 'a');
    c.set(2, 'b');
    c.get(1);
    c.set(3, 'c');
    expect(c.has(2)).toBe(false);
    expect(c.has(1)).toBe(true);
  });

  it('set bumps frequency on update', () => {
    const c = new LfuCache<number, string>(2);
    c.set(1, 'a');
    c.set(2, 'b');
    c.set(1, 'x');
    c.set(3, 'c');
    expect(c.has(2)).toBe(false);
    expect(c.get(1)).toBe('x');
  });

  it('capacity 1', () => {
    const c = new LfuCache<number, string>(1);
    c.set(1, 'a');
    c.set(2, 'b');
    expect(c.has(1)).toBe(false);
    expect(c.get(2)).toBe('b');
  });

  it('many sets', () => {
    const c = new LfuCache<number, number>(50);
    for (let i = 0; i < 100; i += 1) c.set(i, i);
    expect(c.size).toBe(50);
  });

  it('frequency promotion chain works', () => {
    const c = new LfuCache<number, string>(3);
    c.set(1, 'a');
    c.set(2, 'b');
    c.set(3, 'c');
    c.get(1);
    c.get(1);
    c.get(2);
    c.set(4, 'd');
    expect(c.has(3)).toBe(false);
    expect(c.has(1)).toBe(true);
    expect(c.has(2)).toBe(true);
    expect(c.has(4)).toBe(true);
  });

  it('reinsert after eviction', () => {
    const c = new LfuCache<number, string>(2);
    c.set(1, 'a');
    c.set(2, 'b');
    c.set(3, 'c');
    expect(c.has(1)).toBe(false);
    c.set(1, 'a2');
    expect(c.get(1)).toBe('a2');
  });

  it('size never exceeds capacity', () => {
    const c = new LfuCache<number, number>(5);
    for (let i = 0; i < 20; i += 1) {
      c.set(i, i);
      expect(c.size).toBeLessThanOrEqual(5);
    }
  });
});
