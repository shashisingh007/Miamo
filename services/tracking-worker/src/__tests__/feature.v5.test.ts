/**
 * v5 feature-aggregator tests — exercise the four new signals derived from
 * tracking aggregates: dwellHistogram, hesitationP50Ms, regretRate,
 * repeatPassRate. Pure functions (no Prisma).
 */
import { describe, it, expect } from 'vitest';
import { PercentileEstimator } from '../buckets';
import { _internals } from '../feature';

const {
  dwellHistogramOf,
  hesitationP50MsOf,
  regretRateOf,
  repeatPassRateOf,
} = _internals as {
  dwellHistogramOf: (rows: Array<{ uidHash: string; evt: string; bucket: Date; count: number; durSum: number; meta?: { hist?: number[] } | null }>) => number[] | null;
  hesitationP50MsOf: (rows: Array<{ uidHash: string; evt: string; bucket: Date; count: number; durSum: number; durP50?: number }>) => number | null;
  regretRateOf: (rows: Array<{ uidHash: string; evt: string; day: Date; count: number; durSum: number }>) => number | null;
  repeatPassRateOf: (rows: Array<{ uidHash: string; evt: string; day: Date; count: number; durSum: number }>) => number | null;
};

const u = 'uH';
const bucket = new Date(Date.UTC(2026, 4, 26, 14, 0, 0));
const day = new Date(Date.UTC(2026, 4, 26, 0, 0, 0));

function hourRow(evt: string, count: number, extras: Partial<{ durSum: number; durP50: number; meta: { hist?: number[] } }> = {}) {
  return { uidHash: u, evt, bucket, count, durSum: 0, ...extras };
}
function dayRow(evt: string, count: number, extras: Partial<{ durSum: number }> = {}) {
  return { uidHash: u, evt, day, count, durSum: 0, ...extras };
}

describe('dwellHistogramOf', () => {
  it('returns null when no samples', () => {
    expect(dwellHistogramOf([])).toBeNull();
  });
  it('returns null when total samples < 10', () => {
    const rows = [hourRow('card.impression.100', 9, { meta: { hist: [1, 2, 3, 2, 1] } })];
    expect(dwellHistogramOf(rows)).toBeNull();
  });
  it('merges hourly histograms across the window and L1-normalises', () => {
    const rows = [
      hourRow('card.impression.100', 5, { meta: { hist: [5, 0, 0, 0, 0] } }),
      hourRow('card.impression.100', 5, { meta: { hist: [0, 5, 0, 0, 0] } }),
      hourRow('card.impression.100', 5, { meta: { hist: [0, 0, 5, 5, 5] } }),
    ];
    const h = dwellHistogramOf(rows);
    expect(h).not.toBeNull();
    expect(h!.length).toBe(5);
    const sum = h!.reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThan(0.99);
    expect(sum).toBeLessThanOrEqual(1.001);
  });
  it('ignores non-card.impression.100 events', () => {
    const rows = [
      hourRow('swipe.commit', 100, { meta: { hist: [100, 0, 0, 0, 0] } }),
      hourRow('card.impression.100', 5, { meta: { hist: [0, 0, 5, 5, 5] } }),
    ];
    const h = dwellHistogramOf(rows);
    // Only the second row contributes (15 samples → above threshold).
    expect(h).not.toBeNull();
    expect(h![0]).toBe(0);
    expect(h![1]).toBe(0);
  });
});

describe('hesitationP50MsOf', () => {
  it('returns null below sample threshold', () => {
    const rows = Array.from({ length: 4 }, () => hourRow('swipe.commit', 1, { durP50: 1200 }));
    expect(hesitationP50MsOf(rows)).toBeNull();
  });
  it('returns the median of per-hour p50 medians', () => {
    const rows = [1000, 1500, 2000, 2500, 3000].map((p) => hourRow('swipe.commit', 1, { durP50: p }));
    expect(hesitationP50MsOf(rows)).toBe(2000);
  });
  it('ignores non-swipe.commit events', () => {
    const rows = [
      ...Array.from({ length: 10 }, () => hourRow('attention.idle', 1, { durP50: 99999 })),
      ...[800, 900, 1100, 1300, 1500].map((p) => hourRow('swipe.commit', 1, { durP50: p })),
    ];
    expect(hesitationP50MsOf(rows)).toBe(1100);
  });
});

describe('regretRateOf', () => {
  it('returns null below commit threshold', () => {
    expect(regretRateOf([dayRow('swipe.commit', 5), dayRow('swipe.regret', 3)])).toBeNull();
  });
  it('computes regret / commit rounded to 3dp', () => {
    const rows = [dayRow('swipe.commit', 100), dayRow('swipe.regret', 7)];
    expect(regretRateOf(rows)).toBe(0.07);
  });
});

describe('repeatPassRateOf', () => {
  it('returns null below impressions threshold', () => {
    const rows = [dayRow('card.impression.100', 10), dayRow('swipe.repeat_pass', 3)];
    expect(repeatPassRateOf(rows)).toBeNull();
  });
  it('computes repeat_pass / impressions rounded to 3dp', () => {
    const rows = [dayRow('card.impression.100', 200), dayRow('swipe.repeat_pass', 5)];
    expect(repeatPassRateOf(rows)).toBe(0.025);
  });
});

describe('PercentileEstimator.histogram', () => {
  it('bins samples into the provided edges', () => {
    const pe = new PercentileEstimator();
    [100, 200, 500, 800, 1500, 3000, 6000, 12000].forEach((v) => pe.add(v));
    const h = pe.histogram([0, 750, 2000, 5000, 10000]);
    // 100, 200, 500 -> bucket 0; 800, 1500 -> bucket 1; 3000 -> bucket 2;
    // 6000 -> bucket 3; 12000 -> bucket 4.
    expect(h).toEqual([3, 2, 1, 1, 1]);
  });
  it('returns zeros for an empty estimator', () => {
    const pe = new PercentileEstimator();
    expect(pe.histogram([0, 750, 2000, 5000, 10000])).toEqual([0, 0, 0, 0, 0]);
  });
});
