import { describe, it, expect } from 'vitest';
import { createLruTtlCache } from '../lruTtlCache';

describe('lruTtlCache', () => {
  it('throws on bad config', () => {
    expect(() => createLruTtlCache({ maxEntries: 0, ttlMs: 1000 })).toThrow();
    expect(() => createLruTtlCache({ maxEntries: 5, ttlMs: 0 })).toThrow();
    expect(() => createLruTtlCache({ maxEntries: -3, ttlMs: 1000 })).toThrow();
  });

  it('get returns undefined for missing keys', () => {
    let t = 0;
    const c = createLruTtlCache<string, number>({ maxEntries: 5, ttlMs: 1000, now: () => t });
    expect(c.get('x')).toBeUndefined();
  });

  it('set/get roundtrip', () => {
    let t = 0;
    const c = createLruTtlCache<string, number>({ maxEntries: 5, ttlMs: 1000, now: () => t });
    c.set('a', 1);
    expect(c.get('a')).toBe(1);
    expect(c.size).toBe(1);
  });

  it('entry expires after ttl', () => {
    let t = 0;
    const c = createLruTtlCache<string, number>({ maxEntries: 5, ttlMs: 100, now: () => t });
    c.set('a', 1);
    t = 99;
    expect(c.get('a')).toBe(1);
    t = 200;
    expect(c.get('a')).toBeUndefined();
    expect(c.size).toBe(0);
  });

  it('has triggers expiry sweep for queried key', () => {
    let t = 0;
    const c = createLruTtlCache<string, number>({ maxEntries: 5, ttlMs: 50, now: () => t });
    c.set('a', 1);
    t = 100;
    expect(c.has('a')).toBe(false);
    expect(c.size).toBe(0);
  });

  it('LRU eviction at capacity', () => {
    let t = 0;
    const c = createLruTtlCache<string, number>({ maxEntries: 2, ttlMs: 1000, now: () => t });
    c.set('a', 1);
    c.set('b', 2);
    c.set('c', 3);
    expect(c.has('a')).toBe(false);
    expect(c.has('b')).toBe(true);
    expect(c.has('c')).toBe(true);
  });

  it('get refreshes recency', () => {
    let t = 0;
    const c = createLruTtlCache<string, number>({ maxEntries: 2, ttlMs: 1000, now: () => t });
    c.set('a', 1);
    c.set('b', 2);
    c.get('a'); // a now most-recent
    c.set('c', 3); // should evict b
    expect(c.has('a')).toBe(true);
    expect(c.has('b')).toBe(false);
    expect(c.has('c')).toBe(true);
  });

  it('set on existing key refreshes recency and TTL', () => {
    let t = 0;
    const c = createLruTtlCache<string, number>({ maxEntries: 5, ttlMs: 100, now: () => t });
    c.set('a', 1);
    t = 80;
    c.set('a', 2);
    t = 150;
    expect(c.get('a')).toBe(2);
  });

  it('delete returns true when removed', () => {
    let t = 0;
    const c = createLruTtlCache<string, number>({ maxEntries: 5, ttlMs: 1000, now: () => t });
    c.set('a', 1);
    expect(c.delete('a')).toBe(true);
    expect(c.delete('a')).toBe(false);
    expect(c.size).toBe(0);
  });

  it('clear empties cache', () => {
    let t = 0;
    const c = createLruTtlCache<string, number>({ maxEntries: 5, ttlMs: 1000, now: () => t });
    c.set('a', 1);
    c.set('b', 2);
    c.clear();
    expect(c.size).toBe(0);
    expect(c.has('a')).toBe(false);
  });

  it('default clock uses Date.now (smoke)', () => {
    const c = createLruTtlCache<string, number>({ maxEntries: 1, ttlMs: 10000 });
    c.set('a', 1);
    expect(c.get('a')).toBe(1);
  });

  it('does not over-evict below capacity', () => {
    let t = 0;
    const c = createLruTtlCache<string, number>({ maxEntries: 3, ttlMs: 1000, now: () => t });
    c.set('a', 1);
    c.set('b', 2);
    expect(c.size).toBe(2);
  });

  it('expired entries do not count toward LRU recency', () => {
    let t = 0;
    const c = createLruTtlCache<string, number>({ maxEntries: 2, ttlMs: 50, now: () => t });
    c.set('a', 1);
    t = 100; // a expires
    c.set('b', 2);
    c.set('c', 3);
    // a was expired, b/c still in
    expect(c.has('a')).toBe(false);
    expect(c.has('b')).toBe(true);
    expect(c.has('c')).toBe(true);
  });

  it('size reflects manual deletes', () => {
    let t = 0;
    const c = createLruTtlCache<string, number>({ maxEntries: 5, ttlMs: 1000, now: () => t });
    c.set('a', 1);
    c.set('b', 2);
    c.delete('a');
    expect(c.size).toBe(1);
  });

  it('value of any type supported', () => {
    let t = 0;
    const c = createLruTtlCache<string, unknown>({ maxEntries: 5, ttlMs: 1000, now: () => t });
    const obj = { ok: true };
    c.set('o', obj);
    expect(c.get('o')).toBe(obj);
  });
});
