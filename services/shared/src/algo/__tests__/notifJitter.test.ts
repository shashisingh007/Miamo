import { describe, it, expect } from 'vitest';
import { jitteredSendAt, bucketIntoWindows } from '../notifJitter';

const T = 1_700_000_000_000;

describe('jitteredSendAt', () => {
  it('is deterministic for same (user, campaign, plannedAt)', () => {
    const a = jitteredSendAt('u1', 'c1', T);
    const b = jitteredSendAt('u1', 'c1', T);
    expect(a).toBe(b);
  });
  it('differs across users for same campaign', () => {
    const a = jitteredSendAt('u1', 'c1', T);
    const b = jitteredSendAt('u2', 'c1', T);
    expect(a).not.toBe(b);
  });
  it('differs across campaigns for same user', () => {
    const a = jitteredSendAt('u1', 'c1', T);
    const b = jitteredSendAt('u1', 'c2', T);
    expect(a).not.toBe(b);
  });
  it('stays within [-maxMs, +maxMs] of plannedAt', () => {
    for (let i = 0; i < 100; i++) {
      const t = jitteredSendAt(`u${i}`, 'c', T, { maxMs: 30_000 });
      expect(Math.abs(t - T)).toBeLessThanOrEqual(30_000);
    }
  });
  it('returns plannedAt exactly when maxMs = 0', () => {
    expect(jitteredSendAt('u', 'c', T, { maxMs: 0 })).toBe(T);
  });
  it('respects minMs floor on magnitude', () => {
    for (let i = 0; i < 50; i++) {
      const t = jitteredSendAt(`u${i}`, 'c', T, { maxMs: 60_000, minMs: 10_000 });
      expect(Math.abs(t - T)).toBeGreaterThanOrEqual(10_000);
      expect(Math.abs(t - T)).toBeLessThanOrEqual(60_000);
    }
  });
});

describe('bucketIntoWindows', () => {
  it('produces one entry per user, preserving order', () => {
    const out = bucketIntoWindows(['a', 'b', 'c'], 'k', T);
    expect(out.map((x) => x.userId)).toEqual(['a', 'b', 'c']);
  });
  it('spreads users across the jitter window', () => {
    const out = bucketIntoWindows(
      Array.from({ length: 1000 }, (_, i) => `u${i}`), 'k', T, { maxMs: 60_000 },
    );
    const offsets = out.map((x) => x.sendAtMs - T);
    const min = Math.min(...offsets);
    const max = Math.max(...offsets);
    // With 1000 users and ±60s window we expect at least 50s of spread
    // on each side.
    expect(min).toBeLessThan(-50_000);
    expect(max).toBeGreaterThan(50_000);
  });
});
