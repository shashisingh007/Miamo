import { describe, it, expect } from 'vitest';
import { RobinHoodHashMap } from '../robinHoodHashMap';

describe('RobinHoodHashMap', () => {
  it('rejects bad initialCapacity', () => {
    expect(() => new RobinHoodHashMap({ initialCapacity: 0 })).toThrow(RangeError);
    expect(() => new RobinHoodHashMap({ initialCapacity: 7 })).toThrow(RangeError);
  });

  it('rejects bad loadFactor', () => {
    expect(() => new RobinHoodHashMap({ loadFactor: 0 })).toThrow(RangeError);
    expect(() => new RobinHoodHashMap({ loadFactor: 1 })).toThrow(RangeError);
  });

  it('set/get rejects non-string key', () => {
    const m = new RobinHoodHashMap<number>();
    expect(() => m.set(42 as any, 1)).toThrow(TypeError);
    expect(() => m.get(42 as any)).toThrow(TypeError);
    expect(() => m.delete(42 as any)).toThrow(TypeError);
  });

  it('empty map has size 0', () => {
    const m = new RobinHoodHashMap<number>();
    expect(m.size()).toBe(0);
    expect(m.get('x')).toBeUndefined();
    expect(m.has('x')).toBe(false);
  });

  it('set and get a single value', () => {
    const m = new RobinHoodHashMap<number>();
    m.set('hello', 42);
    expect(m.get('hello')).toBe(42);
    expect(m.size()).toBe(1);
    expect(m.has('hello')).toBe(true);
  });

  it('overwrite same key updates value', () => {
    const m = new RobinHoodHashMap<number>();
    m.set('k', 1);
    m.set('k', 2);
    expect(m.get('k')).toBe(2);
    expect(m.size()).toBe(1);
  });

  it('delete removes', () => {
    const m = new RobinHoodHashMap<string>();
    m.set('a', 'apple');
    expect(m.delete('a')).toBe(true);
    expect(m.get('a')).toBeUndefined();
    expect(m.size()).toBe(0);
    expect(m.delete('a')).toBe(false);
  });

  it('handles many inserts (triggers resize)', () => {
    const m = new RobinHoodHashMap<number>({ initialCapacity: 16 });
    for (let i = 0; i < 1000; i += 1) m.set(`key${i}`, i);
    expect(m.size()).toBe(1000);
    for (let i = 0; i < 1000; i += 1) expect(m.get(`key${i}`)).toBe(i);
  });

  it('keys returns all current keys', () => {
    const m = new RobinHoodHashMap<number>();
    m.set('a', 1);
    m.set('b', 2);
    m.set('c', 3);
    expect(new Set(m.keys())).toEqual(new Set(['a', 'b', 'c']));
  });

  it('keys excludes deleted', () => {
    const m = new RobinHoodHashMap<number>();
    m.set('a', 1);
    m.set('b', 2);
    m.delete('a');
    expect(m.keys()).toEqual(['b']);
  });

  it('survives insert-delete cycle', () => {
    const m = new RobinHoodHashMap<number>({ initialCapacity: 16 });
    for (let i = 0; i < 200; i += 1) m.set(`k${i}`, i);
    for (let i = 0; i < 100; i += 1) m.delete(`k${i}`);
    for (let i = 100; i < 200; i += 1) expect(m.get(`k${i}`)).toBe(i);
    for (let i = 0; i < 100; i += 1) expect(m.get(`k${i}`)).toBeUndefined();
  });

  it('re-set after delete', () => {
    const m = new RobinHoodHashMap<number>();
    m.set('x', 1);
    m.delete('x');
    m.set('x', 9);
    expect(m.get('x')).toBe(9);
  });

  it('empty string key works', () => {
    const m = new RobinHoodHashMap<string>();
    m.set('', 'empty');
    expect(m.get('')).toBe('empty');
  });

  it('returns undefined for missing after collisions', () => {
    const m = new RobinHoodHashMap<number>({ initialCapacity: 8 });
    for (let i = 0; i < 5; i += 1) m.set(`k${i}`, i);
    expect(m.get('missing')).toBeUndefined();
  });

  it('size accurate during deletion', () => {
    const m = new RobinHoodHashMap<number>();
    for (let i = 0; i < 50; i += 1) m.set(`k${i}`, i);
    expect(m.size()).toBe(50);
    for (let i = 0; i < 25; i += 1) m.delete(`k${i}`);
    expect(m.size()).toBe(25);
  });

  it('many string-keyed sets match plain map', () => {
    const m = new RobinHoodHashMap<number>();
    const ref = new Map<string, number>();
    for (let i = 0; i < 500; i += 1) {
      const k = String(Math.floor(Math.random() * 200));
      const v = Math.floor(Math.random() * 1000);
      m.set(k, v);
      ref.set(k, v);
    }
    for (const [k, v] of ref) expect(m.get(k)).toBe(v);
    expect(m.size()).toBe(ref.size);
  });

  it('unicode keys', () => {
    const m = new RobinHoodHashMap<number>();
    m.set('αβγ', 1);
    m.set('日本', 2);
    expect(m.get('αβγ')).toBe(1);
    expect(m.get('日本')).toBe(2);
  });
});
