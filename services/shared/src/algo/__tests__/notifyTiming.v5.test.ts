/**
 * notifyTiming v5 — daily cap + dismiss back-off.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { nextNotifyAtV4, nextNotifyAtV5, nextNotifyAtDispatch } from '../notifyTiming';

const baseV4 = {
  now: new Date('2026-05-26T08:00:00Z'),
  peakHours: [9, 10, 11, 20, 21],
  quietHours: [0, 1, 2, 3, 4, 5, 6, 7],
  lastSent: null,
  minSpacingSec: 3600,
  tzOffsetMin: 0,
};

describe('nextNotifyAtV5', () => {
  it('returns the same Date as v4 when under cap and no dismiss back-off', () => {
    const v4 = nextNotifyAtV4(baseV4).getTime();
    const v5 = nextNotifyAtV5({ ...baseV4, sentToday: 1, consecutiveDismisses: 0 }).getTime();
    expect(v5).toBe(v4);
  });

  it('pushes to next day when sentToday >= dailyCap', () => {
    const v4 = nextNotifyAtV4(baseV4);
    const v5 = nextNotifyAtV5({ ...baseV4, sentToday: 4 });
    // Next day at first peak hour (9 UTC).
    expect(v5.getUTCDate()).toBe(v4.getUTCDate() + 1);
    expect(v5.getUTCHours()).toBe(9);
  });

  it('respects a custom dailyCap', () => {
    const same = nextNotifyAtV5({ ...baseV4, sentToday: 2, dailyCap: 5 }).getTime();
    const pushed = nextNotifyAtV5({ ...baseV4, sentToday: 5, dailyCap: 5 }).getTime();
    expect(same).toBe(nextNotifyAtV4(baseV4).getTime());
    expect(pushed).toBeGreaterThan(same);
  });

  it('pushes to next day when consecutiveDismisses >= dismissBackoffN', () => {
    const v5 = nextNotifyAtV5({ ...baseV4, sentToday: 0, consecutiveDismisses: 3 });
    const v4 = nextNotifyAtV4(baseV4);
    expect(v5.getUTCDate()).toBe(v4.getUTCDate() + 1);
  });

  it('does not back off when consecutiveDismisses below threshold', () => {
    const v5 = nextNotifyAtV5({ ...baseV4, sentToday: 0, consecutiveDismisses: 2 });
    expect(v5.getTime()).toBe(nextNotifyAtV4(baseV4).getTime());
  });
});

describe('nextNotifyAtDispatch', () => {
  const prev = process.env.ALGO_V5_NOTIFY_TIMING_ENABLED;
  beforeEach(() => { delete process.env.ALGO_V5_NOTIFY_TIMING_ENABLED; });
  afterEach(() => {
    if (prev === undefined) delete process.env.ALGO_V5_NOTIFY_TIMING_ENABLED;
    else process.env.ALGO_V5_NOTIFY_TIMING_ENABLED = prev;
  });

  it('defaults to v4 (ignores cap when flag is off)', () => {
    const result = nextNotifyAtDispatch({ ...baseV4, sentToday: 999, consecutiveDismisses: 999 });
    expect(result.getTime()).toBe(nextNotifyAtV4(baseV4).getTime());
  });

  it('honours daily cap when ALGO_V5_NOTIFY_TIMING_ENABLED=1', () => {
    process.env.ALGO_V5_NOTIFY_TIMING_ENABLED = '1';
    const result = nextNotifyAtDispatch({ ...baseV4, sentToday: 999 });
    expect(result.getTime()).toBeGreaterThan(nextNotifyAtV4(baseV4).getTime());
  });
});
