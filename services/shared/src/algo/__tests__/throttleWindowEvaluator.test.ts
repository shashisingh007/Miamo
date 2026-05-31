import { describe, it, expect } from 'vitest';
import {
  evaluateThrottleWindow,
  trimThrottleSamples,
} from '../throttleWindowEvaluator';

const NOW = 1_700_000_000_000;
const OPTS = { windowMs: 1_000, softLimitPerSec: 10, hardLimitPerSec: 20 };

describe('throttleWindowEvaluator', () => {
  it('empty samples -> normal', () => {
    const r = evaluateThrottleWindow([], NOW, OPTS);
    expect(r.total).toBe(0);
    expect(r.classification).toBe('normal');
  });

  it('under soft -> normal', () => {
    const r = evaluateThrottleWindow(
      [{ tsMs: NOW, count: 5 }],
      NOW,
      OPTS,
    );
    expect(r.classification).toBe('normal');
  });

  it('at soft -> elevated', () => {
    const r = evaluateThrottleWindow(
      [{ tsMs: NOW, count: 10 }],
      NOW,
      OPTS,
    );
    expect(r.classification).toBe('elevated');
  });

  it('at hard -> throttled with retryAfterMs > 0', () => {
    const r = evaluateThrottleWindow(
      [{ tsMs: NOW, count: 25 }],
      NOW,
      OPTS,
    );
    expect(r.classification).toBe('throttled');
    expect(r.retryAfterMs).toBeGreaterThan(0);
  });

  it('drops samples outside window', () => {
    const r = evaluateThrottleWindow(
      [{ tsMs: NOW - 5_000, count: 100 }, { tsMs: NOW, count: 2 }],
      NOW,
      OPTS,
    );
    expect(r.total).toBe(2);
  });

  it('drops future samples (tsMs > now)', () => {
    const r = evaluateThrottleWindow(
      [{ tsMs: NOW + 1, count: 100 }],
      NOW,
      OPTS,
    );
    expect(r.total).toBe(0);
  });

  it('negative/NaN counts ignored', () => {
    const r = evaluateThrottleWindow(
      [
        { tsMs: NOW, count: -5 } as any,
        { tsMs: NOW, count: NaN } as any,
        { tsMs: NOW, count: 3 },
      ],
      NOW,
      OPTS,
    );
    expect(r.total).toBe(3);
  });

  it('perSec scales by window length', () => {
    const r = evaluateThrottleWindow(
      [{ tsMs: NOW, count: 100 }],
      NOW,
      { windowMs: 10_000, softLimitPerSec: 5, hardLimitPerSec: 50 },
    );
    expect(r.perSec).toBeCloseTo(10, 5);
    expect(r.classification).toBe('elevated');
  });

  it('hard floor raised to soft when smaller', () => {
    const r = evaluateThrottleWindow(
      [{ tsMs: NOW, count: 10 }],
      NOW,
      { windowMs: 1_000, softLimitPerSec: 10, hardLimitPerSec: 1 },
    );
    expect(r.classification).toBe('throttled');
  });

  it('windowMs floor=1 (handles 0)', () => {
    const r = evaluateThrottleWindow(
      [{ tsMs: NOW, count: 1 }],
      NOW,
      { windowMs: 0, softLimitPerSec: 0, hardLimitPerSec: 0 },
    );
    expect(r.total).toBe(1);
  });

  it('hard=0 disables throttled', () => {
    const r = evaluateThrottleWindow(
      [{ tsMs: NOW, count: 1000 }],
      NOW,
      { windowMs: 1_000, softLimitPerSec: 0, hardLimitPerSec: 0 },
    );
    expect(r.classification).toBe('normal');
  });

  it('trimThrottleSamples keeps only in-window', () => {
    const trimmed = trimThrottleSamples(
      [
        { tsMs: NOW - 5_000, count: 1 },
        { tsMs: NOW - 500, count: 2 },
        { tsMs: NOW, count: 3 },
      ],
      NOW,
      1_000,
    );
    expect(trimmed.map((s) => s.count)).toEqual([2, 3]);
  });
});
