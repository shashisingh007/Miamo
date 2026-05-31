import { describe, it, expect } from 'vitest';
import { createDnsTtlCache } from '../dnsTtlCache';

const NOW = 1_700_000_000_000;

describe('dnsTtlCache', () => {
  it('miss on empty', () => {
    const c = createDnsTtlCache<string[]>();
    expect(c.get('example.com', 'A', NOW)).toEqual({ hit: false });
  });

  it('put then fresh hit', () => {
    const c = createDnsTtlCache<string[]>();
    c.put({ name: 'example.com', type: 'A', value: ['1.2.3.4'], ttlSec: 60, nowMs: NOW });
    const r = c.get('example.com', 'A', NOW + 10_000);
    expect(r.hit && r.fresh).toBe(true);
  });

  it('stale after TTL', () => {
    const c = createDnsTtlCache<string[]>();
    c.put({ name: 'a', type: 'A', value: ['x'], ttlSec: 1, nowMs: NOW });
    const r = c.get('a', 'A', NOW + 2_000);
    expect(r.hit).toBe(true);
    if (r.hit) expect(r.fresh).toBe(false);
  });

  it('name lookup is case-insensitive', () => {
    const c = createDnsTtlCache<number>();
    c.put({ name: 'Foo.COM', type: 'TXT', value: 1, ttlSec: 60, nowMs: NOW });
    expect(c.get('foo.com', 'TXT', NOW).hit).toBe(true);
  });

  it('different type isolated', () => {
    const c = createDnsTtlCache<number>();
    c.put({ name: 'h', type: 'A', value: 1, ttlSec: 60, nowMs: NOW });
    expect(c.get('h', 'AAAA', NOW).hit).toBe(false);
  });

  it('put refreshes entry (overwrite)', () => {
    const c = createDnsTtlCache<number>();
    c.put({ name: 'h', type: 'A', value: 1, ttlSec: 60, nowMs: NOW });
    c.put({ name: 'h', type: 'A', value: 2, ttlSec: 60, nowMs: NOW + 5_000 });
    const r = c.get('h', 'A', NOW + 5_000);
    expect(r.hit && r.entry.value).toBe(2);
  });

  it('LRU eviction when over max', () => {
    const c = createDnsTtlCache<number>({ maxEntries: 2 });
    c.put({ name: 'a', type: 'A', value: 1, ttlSec: 60, nowMs: NOW });
    c.put({ name: 'b', type: 'A', value: 2, ttlSec: 60, nowMs: NOW });
    c.put({ name: 'c', type: 'A', value: 3, ttlSec: 60, nowMs: NOW });
    expect(c.size()).toBe(2);
    expect(c.get('a', 'A', NOW).hit).toBe(false);
    expect(c.get('c', 'A', NOW).hit).toBe(true);
  });

  it('purgeStale removes expired', () => {
    const c = createDnsTtlCache<number>();
    c.put({ name: 'a', type: 'A', value: 1, ttlSec: 1, nowMs: NOW });
    c.put({ name: 'b', type: 'A', value: 2, ttlSec: 1000, nowMs: NOW });
    const removed = c.purgeStale(NOW + 5_000);
    expect(removed).toBe(1);
    expect(c.size()).toBe(1);
  });

  it('ttlSec=0 always stale', () => {
    const c = createDnsTtlCache<number>();
    c.put({ name: 'x', type: 'A', value: 1, ttlSec: 0, nowMs: NOW });
    const r = c.get('x', 'A', NOW);
    expect(r.hit && r.fresh).toBe(false);
  });

  it('negative ttl clamped to 0', () => {
    const c = createDnsTtlCache<number>();
    const e = c.put({ name: 'x', type: 'A', value: 1, ttlSec: -5, nowMs: NOW });
    expect(e.ttlSec).toBe(0);
  });

  it('maxEntries floor=1', () => {
    const c = createDnsTtlCache<number>({ maxEntries: 0 });
    c.put({ name: 'a', type: 'A', value: 1, ttlSec: 60, nowMs: NOW });
    c.put({ name: 'b', type: 'A', value: 2, ttlSec: 60, nowMs: NOW });
    expect(c.size()).toBe(1);
  });

  it('clock skew (future fetchedAt) treated as stale', () => {
    const c = createDnsTtlCache<number>();
    c.put({ name: 'x', type: 'A', value: 1, ttlSec: 60, nowMs: NOW + 10_000 });
    const r = c.get('x', 'A', NOW);
    expect(r.hit && r.fresh).toBe(false);
  });
});
