import { describe, it, expect } from 'vitest';
import { buildPairBatch, type PairBatchUser, type PairBatchCacheEntry } from '../pairBatch';

const NOW = 1_000_000_000_000;

function u(id: string, hoursAgo = 0): PairBatchUser {
  return { id, lastActiveAt: NOW - hoursAgo * 60 * 60 * 1000 };
}

describe('buildPairBatch', () => {
  it('returns [] for <2 users', () => {
    expect(buildPairBatch([], [], { now: NOW })).toEqual([]);
    expect(buildPairBatch([u('a')], [], { now: NOW })).toEqual([]);
  });

  it('generates all C(n,2) pairs when cache is empty', () => {
    const out = buildPairBatch([u('a'), u('b'), u('c')], [], { now: NOW });
    expect(out).toHaveLength(3);
  });

  it('orders aId < bId lexically', () => {
    const out = buildPairBatch([u('z'), u('a')], [], { now: NOW });
    expect(out[0].aId < out[0].bId).toBe(true);
  });

  it('skips pairs whose cache entry is fresh', () => {
    const cache: PairBatchCacheEntry[] = [
      { aId: 'a', bId: 'b', updatedAt: NOW - 1000 }, // 1s ago, fresh
    ];
    const out = buildPairBatch([u('a'), u('b'), u('c')], cache, { now: NOW });
    expect(out.find((p) => p.aId === 'a' && p.bId === 'b')).toBeUndefined();
    expect(out).toHaveLength(2);
  });

  it('does NOT skip pairs whose cache entry is stale', () => {
    const cache: PairBatchCacheEntry[] = [
      { aId: 'a', bId: 'b', updatedAt: NOW - 24 * 60 * 60 * 1000 }, // 24h ago
    ];
    const out = buildPairBatch([u('a'), u('b')], cache, { now: NOW });
    expect(out).toHaveLength(1);
  });

  it('honours custom freshMs', () => {
    const cache: PairBatchCacheEntry[] = [
      { aId: 'a', bId: 'b', updatedAt: NOW - 60_000 }, // 1m ago
    ];
    const out = buildPairBatch([u('a'), u('b')], cache, { now: NOW, freshMs: 30_000 });
    expect(out).toHaveLength(1); // stale under 30s window
  });

  it('caps output at maxPairs', () => {
    const users = ['a', 'b', 'c', 'd', 'e'].map((id) => u(id));
    const out = buildPairBatch(users, [], { now: NOW, maxPairs: 3 });
    expect(out).toHaveLength(3);
  });

  it('sorts users by recency so densest pairs come first', () => {
    const users = [u('old', 100), u('newA', 0), u('newB', 1)];
    const out = buildPairBatch(users, [], { now: NOW });
    // First pair should involve the two newest users (newA, newB).
    expect([out[0].aId, out[0].bId].sort()).toEqual(['newA', 'newB']);
  });

  it('treats (b,a) and (a,b) as the same pair when filtering cache', () => {
    const cache: PairBatchCacheEntry[] = [
      { aId: 'b', bId: 'a', updatedAt: NOW - 100 }, // reversed but fresh
    ];
    const out = buildPairBatch([u('a'), u('b')], cache, { now: NOW });
    expect(out).toEqual([]);
  });

  it('maxPairs=0 returns empty', () => {
    const out = buildPairBatch([u('a'), u('b')], [], { now: NOW, maxPairs: 0 });
    expect(out).toEqual([]);
  });
});
