import { describe, it, expect } from 'vitest';
import { _internals } from '../focusAffinity';

const { foldFocusRows } = _internals;

const u = 'uH';
const bucket = new Date(Date.UTC(2026, 4, 31, 10, 0, 0));

describe('foldFocusRows', () => {
  it('returns empty for rows with no targets', () => {
    expect(foldFocusRows([
      { uidHash: u, evt: 'focus.element', bucket, durSum: 0, meta: null },
      { uidHash: u, evt: 'focus.element', bucket, durSum: 0, meta: { route: '/d' } },
    ])).toEqual([]);
  });

  it('accumulates focusCount per (route, elementId, bucket)', () => {
    const out = foldFocusRows([
      { uidHash: u, evt: 'focus.element', bucket, durSum: 0,
        meta: { route: '/discover', targets: { 'card-1': 3, 'card-2': 2 } } },
    ]);
    expect(out).toHaveLength(2);
    expect(out.find((r) => r.elementId === 'card-1')!.focusCount).toBe(3);
    expect(out.find((r) => r.elementId === 'card-2')!.focusCount).toBe(2);
  });

  it('spreads intent.dwell durSum evenly across targets', () => {
    const out = foldFocusRows([
      { uidHash: u, evt: 'intent.dwell', bucket, durSum: 10_000,
        meta: { route: '/discover', targets: { a: 2, b: 2 } } },
    ]);
    // Total 4 hits, 2500ms each. a got 2 hits = 5000ms; b same.
    expect(out.find((r) => r.elementId === 'a')!.dwellSumMs).toBe(5000);
    expect(out.find((r) => r.elementId === 'b')!.dwellSumMs).toBe(5000);
  });

  it('merges focus + dwell rows for the same bucket', () => {
    const out = foldFocusRows([
      { uidHash: u, evt: 'focus.element', bucket, durSum: 0,
        meta: { route: '/d', targets: { x: 5 } } },
      { uidHash: u, evt: 'intent.dwell',  bucket, durSum: 8_000,
        meta: { route: '/d', targets: { x: 4 } } },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].focusCount).toBe(5);
    expect(out[0].dwellSumMs).toBe(8000);
  });

  it('separates by route', () => {
    const out = foldFocusRows([
      { uidHash: u, evt: 'focus.element', bucket, durSum: 0,
        meta: { route: '/a', targets: { e: 1 } } },
      { uidHash: u, evt: 'focus.element', bucket, durSum: 0,
        meta: { route: '/b', targets: { e: 1 } } },
    ]);
    expect(out).toHaveLength(2);
  });

  it('uses route="unknown" when meta.route is missing', () => {
    const out = foldFocusRows([
      { uidHash: u, evt: 'focus.element', bucket, durSum: 0,
        meta: { targets: { e: 1 } } },
    ]);
    expect(out[0].route).toBe('unknown');
  });

  it('caps unique keys per (uidHash, bucket) at maxKeysPerBucket', () => {
    const targets: Record<string, number> = {};
    for (let i = 0; i < 500; i += 1) targets[`e${i}`] = 1;
    const out = foldFocusRows([
      { uidHash: u, evt: 'focus.element', bucket, durSum: 0,
        meta: { route: '/d', targets } },
    ], 256);
    expect(out).toHaveLength(256);
  });
});
