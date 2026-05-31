import { describe, it, expect } from 'vitest';
import { _internals } from '../safetyRollup';

const { foldSafetyRows } = _internals;

const day = new Date(Date.UTC(2026, 4, 31, 0, 0, 0));

describe('foldSafetyRows', () => {
  it('returns empty for non-safety events', () => {
    const out = foldSafetyRows([
      { uidHash: 'u', evt: 'click', day, count: 10, meta: null },
      { uidHash: 'u', evt: 'discover.swipe', day, count: 5, meta: null },
    ]);
    expect(out).toEqual([]);
  });

  it('uses default surface when meta.surface is missing', () => {
    const out = foldSafetyRows([
      { uidHash: 'a', evt: 'safety.block', day, count: 2, meta: null },
      { uidHash: 'a', evt: 'safety.report', day, count: 1, meta: null },
    ]);
    expect(out).toHaveLength(2);
    expect(out.find((r) => r.kind === 'block')!.surface).toBe('discover');
    expect(out.find((r) => r.kind === 'report')!.surface).toBe('discover');
  });

  it('honours meta.surface when present', () => {
    const out = foldSafetyRows([
      { uidHash: 'a', evt: 'safety.block', day, count: 1, meta: { surface: 'messages' } },
    ]);
    expect(out[0].surface).toBe('messages');
  });

  it('aggregates count across rows for the same key', () => {
    const out = foldSafetyRows([
      { uidHash: 'a', evt: 'safety.block', day, count: 2, meta: null },
      { uidHash: 'a', evt: 'safety.block', day, count: 5, meta: null },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].count).toBe(7);
  });

  it('separates rows by surface', () => {
    const out = foldSafetyRows([
      { uidHash: 'a', evt: 'safety.block', day, count: 1, meta: { surface: 'discover' } },
      { uidHash: 'a', evt: 'safety.block', day, count: 2, meta: { surface: 'messages' } },
    ]);
    expect(out).toHaveLength(2);
  });

  it('separates hold from unhold (different kind)', () => {
    const out = foldSafetyRows([
      { uidHash: 'a', evt: 'match.hold',   day, count: 3, meta: null },
      { uidHash: 'a', evt: 'match.unhold', day, count: 1, meta: null },
    ]);
    expect(out).toHaveLength(2);
    expect(out.map((r) => r.kind).sort()).toEqual(['hold', 'unhold']);
  });

  it('caps targets at 64', () => {
    const targets: Record<string, number> = {};
    for (let i = 0; i < 100; i += 1) targets[`t${i}`] = 100 - i; // descending
    const out = foldSafetyRows([
      { uidHash: 'a', evt: 'safety.block', day, count: 100, meta: { targets } },
    ]);
    expect(Object.keys(out[0].targets).length).toBe(64);
    // Top-counted targets retained.
    expect(out[0].targets['t0']).toBe(100);
    expect(out[0].targets['t63']).toBeDefined();
    expect(out[0].targets['t64']).toBeUndefined();
  });

  it('merges targets from multiple rows', () => {
    const out = foldSafetyRows([
      { uidHash: 'a', evt: 'safety.block', day, count: 1, meta: { targets: { x: 1 } } },
      { uidHash: 'a', evt: 'safety.block', day, count: 1, meta: { targets: { x: 2, y: 1 } } },
    ]);
    expect(out[0].targets).toEqual({ x: 3, y: 1 });
  });
});
