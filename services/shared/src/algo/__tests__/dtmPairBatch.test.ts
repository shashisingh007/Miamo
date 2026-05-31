import { describe, it, expect } from 'vitest';
import { buildDtmPairBatch } from '../dtmPairBatch';

const NOW = 1_700_000_000_000;
const H = 3_600_000;
const D = 24 * H;

function u(id: string, ageH: number, coveredCount = 8) {
  return { id, lastActiveAt: NOW - ageH * H, coveredCount };
}

describe('buildDtmPairBatch', () => {
  it('returns empty for <2 users', () => {
    expect(buildDtmPairBatch([u('a', 0)], [], { now: NOW })).toEqual([]);
  });

  it('returns empty when maxPairs <= 0', () => {
    expect(buildDtmPairBatch([u('a', 0), u('b', 0)], [], { now: NOW, maxPairs: 0 })).toEqual([]);
  });

  it('filters out users below minCoveredTopics', () => {
    const out = buildDtmPairBatch(
      [u('a', 0, 2), u('b', 0, 8), u('c', 0, 8)],
      [], { now: NOW },
    );
    const ids = new Set(out.flatMap((p) => [p.aId, p.bId]));
    expect(ids.has('a')).toBe(false);
  });

  it('emits pairs sorted lexically (aId < bId)', () => {
    const out = buildDtmPairBatch([u('z', 0), u('a', 1)], [], { now: NOW });
    expect(out[0]).toEqual({ aId: 'a', bId: 'z' });
  });

  it('skips pairs whose cache is fresher than freshMs (default 7d)', () => {
    const out = buildDtmPairBatch(
      [u('a', 0), u('b', 0)],
      [{ aId: 'a', bId: 'b', updatedAt: NOW - 1 * D }],
      { now: NOW },
    );
    expect(out).toHaveLength(0);
  });

  it('includes pairs whose cache is older than freshMs', () => {
    const out = buildDtmPairBatch(
      [u('a', 0), u('b', 0)],
      [{ aId: 'a', bId: 'b', updatedAt: NOW - 10 * D }],
      { now: NOW },
    );
    expect(out).toHaveLength(1);
  });

  it('respects maxPairs cap', () => {
    const users = [u('a', 0), u('b', 1), u('c', 2), u('d', 3)];
    const out = buildDtmPairBatch(users, [], { now: NOW, maxPairs: 2 });
    expect(out).toHaveLength(2);
  });

  it('sorts users by recency desc so densest pairs come first', () => {
    const users = [u('a', 10), u('b', 0), u('c', 5)];
    const out = buildDtmPairBatch(users, [], { now: NOW, maxPairs: 1 });
    // b is newest, then c, then a → first pair involves b
    expect(out[0].aId === 'b' || out[0].bId === 'b').toBe(true);
  });

  it('honours custom freshMs', () => {
    const out = buildDtmPairBatch(
      [u('a', 0), u('b', 0)],
      [{ aId: 'a', bId: 'b', updatedAt: NOW - 1 * H }],
      { now: NOW, freshMs: 30 * 60 * 1000 }, // 30min
    );
    expect(out).toHaveLength(1);
  });
});
