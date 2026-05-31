import { describe, it, expect } from 'vitest';
import { dtmPairPriority } from '../dtmPairPriority';

const NOW = 1_700_000_000_000;
const H = 3_600_000;

const FRESH_FULL = {
  lastActiveAtAMs: NOW,
  lastActiveAtBMs: NOW,
  confidenceA: 0.1,
  confidenceB: 0.1,
  coverageA: 1,
  coverageB: 1,
  nowMs: NOW,
};

describe('dtmPairPriority', () => {
  it('peaks near 1 for fresh, low-confidence, fully-covered pairs', () => {
    const p = dtmPairPriority(FRESH_FULL);
    expect(p).toBeGreaterThan(0.85);
  });
  it('drops with age (one user stale)', () => {
    const p = dtmPairPriority({ ...FRESH_FULL, lastActiveAtAMs: NOW - 100 * H });
    expect(p).toBeLessThan(dtmPairPriority(FRESH_FULL));
  });
  it('drops as confidence rises', () => {
    const lo = dtmPairPriority(FRESH_FULL);
    const hi = dtmPairPriority({ ...FRESH_FULL, confidenceA: 0.95, confidenceB: 0.95 });
    expect(hi).toBeLessThan(lo);
  });
  it('takes the minimum recency (slowest side dominates)', () => {
    const oneStale = dtmPairPriority({
      ...FRESH_FULL, lastActiveAtAMs: NOW, lastActiveAtBMs: NOW - 200 * H,
    });
    const bothStale = dtmPairPriority({
      ...FRESH_FULL, lastActiveAtAMs: NOW - 200 * H, lastActiveAtBMs: NOW - 200 * H,
    });
    expect(oneStale).toBeCloseTo(bothStale, 4);
  });
  it('coverage harmonic punishes asymmetric pairs', () => {
    const sym = dtmPairPriority({ ...FRESH_FULL, coverageA: 0.5, coverageB: 0.5 });
    const asym = dtmPairPriority({ ...FRESH_FULL, coverageA: 0.1, coverageB: 0.9 });
    expect(asym).toBeLessThan(sym);
  });
  it('returns 0 when both coverages are 0', () => {
    const p = dtmPairPriority({ ...FRESH_FULL, coverageA: 0, coverageB: 0 });
    // recency is 1, confGap 0.9, harmonic 0 → 0.35 + 0.35*0.9 + 0 = 0.665
    expect(p).toBeCloseTo(0.35 * 1 + 0.35 * 0.9, 4);
  });
  it('clamps to [0, 1] for absurd inputs', () => {
    const p = dtmPairPriority({
      ...FRESH_FULL, confidenceA: -5, confidenceB: 5, coverageA: 99, coverageB: -1,
    });
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });
});
