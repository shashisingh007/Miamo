import { describe, it, expect } from 'vitest';
import { decideNotifSend } from '../notifSendCap';

const NOW = 1_700_000_000_000;
const MIN = 60_000;

describe('decideNotifSend — global cap', () => {
  it('allows when below cap', () => {
    const d = decideNotifSend([], { category: 'match', atMs: NOW });
    expect(d.allowed).toBe(true);
  });
  it('blocks when at the default cap of 6', () => {
    const recent = Array.from({ length: 6 }, (_, i) => ({
      category: 'misc', sentAtMs: NOW - (i + 1) * 60 * MIN,
    }));
    const d = decideNotifSend(recent, { category: 'match', atMs: NOW });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.reason).toBe('global');
  });
  it('returns retryAfterMs equal to oldest event leaving the window', () => {
    const recent = Array.from({ length: 6 }, (_, i) => ({
      category: 'misc', sentAtMs: NOW - (i + 1) * 60 * MIN,
    }));
    const d = decideNotifSend(recent, { category: 'match', atMs: NOW });
    if (!d.allowed) {
      expect(d.retryAfterMs).toBeGreaterThan(0);
      expect(d.retryAfterMs).toBeLessThanOrEqual(24 * 60 * MIN);
    }
  });
});

describe('decideNotifSend — per-category cap', () => {
  it('blocks when category cap is reached', () => {
    const recent = [
      { category: 'match', sentAtMs: NOW - 30 * MIN },
      { category: 'match', sentAtMs: NOW - 90 * MIN },
    ];
    const d = decideNotifSend(recent, { category: 'match', atMs: NOW }, {
      perCategoryCapPer24h: { match: 2 }, minGapMinutes: 0,
    });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.reason).toBe('category');
  });
});

describe('decideNotifSend — min gap', () => {
  it('blocks when last same-category send was too recent', () => {
    const recent = [{ category: 'match', sentAtMs: NOW - 5 * MIN }];
    const d = decideNotifSend(recent, { category: 'match', atMs: NOW });
    expect(d.allowed).toBe(false);
    if (!d.allowed) {
      expect(d.reason).toBe('minGap');
      expect(d.retryAfterMs).toBeCloseTo(25 * MIN, -2);
    }
  });
  it('allows when gap is exactly the minimum', () => {
    const recent = [{ category: 'match', sentAtMs: NOW - 30 * MIN }];
    const d = decideNotifSend(recent, { category: 'match', atMs: NOW });
    expect(d.allowed).toBe(true);
  });
  it('different category does not trigger minGap', () => {
    const recent = [{ category: 'msg', sentAtMs: NOW - 1 * MIN }];
    const d = decideNotifSend(recent, { category: 'match', atMs: NOW });
    expect(d.allowed).toBe(true);
  });
});

describe('decideNotifSend — window', () => {
  it('ignores events older than 24h', () => {
    const recent = Array.from({ length: 50 }, (_, i) => ({
      category: 'misc', sentAtMs: NOW - (25 + i) * 60 * MIN,
    }));
    const d = decideNotifSend(recent, { category: 'match', atMs: NOW });
    expect(d.allowed).toBe(true);
  });
});
