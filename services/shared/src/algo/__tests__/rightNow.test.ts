import { describe, it, expect } from 'vitest';
import { rightNow } from '../rightNow';

const flatHours = Array(24).fill(1);

describe('rightNow', () => {
  it('returns score in [0,1] and component breakdown', () => {
    const r = rightNow({
      hour: 12,
      hourTotals: flatHours,
      recent: { clicks: 0, scrolls: 0, dwellsOver800: 0, rageClicks: 0 },
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(1);
    expect(r.components).toHaveProperty('hourBias');
    expect(r.components).toHaveProperty('surfaceMomentum');
    expect(r.components).toHaveProperty('recencyHeat');
    expect(r.components).toHaveProperty('moodGuess');
  });

  it('peak hour → higher hourBias than off-peak', () => {
    const totals = Array(24).fill(1);
    totals[20] = 100;
    const peak = rightNow({
      hour: 20,
      hourTotals: totals,
      recent: { clicks: 0, scrolls: 0, dwellsOver800: 0, rageClicks: 0 },
    });
    const off = rightNow({
      hour: 4,
      hourTotals: totals,
      recent: { clicks: 0, scrolls: 0, dwellsOver800: 0, rageClicks: 0 },
    });
    expect(peak.components.hourBias).toBeGreaterThan(off.components.hourBias);
  });

  it('rage clicks damp the score', () => {
    const calm = rightNow({
      hour: 12,
      hourTotals: flatHours,
      recent: { clicks: 5, scrolls: 5, dwellsOver800: 1, rageClicks: 0 },
    });
    const rage = rightNow({
      hour: 12,
      hourTotals: flatHours,
      recent: { clicks: 5, scrolls: 5, dwellsOver800: 1, rageClicks: 4 },
    });
    expect(rage.score).toBeLessThan(calm.score);
  });

  it('momentum saturates', () => {
    const a = rightNow({
      hour: 12,
      hourTotals: flatHours,
      recent: { clicks: 30, scrolls: 0, dwellsOver800: 0, rageClicks: 0 },
    });
    const b = rightNow({
      hour: 12,
      hourTotals: flatHours,
      recent: { clicks: 9999, scrolls: 0, dwellsOver800: 0, rageClicks: 0 },
    });
    expect(a.components.surfaceMomentum).toBeCloseTo(b.components.surfaceMomentum, 5);
  });

  it('handles malformed hourTotals length', () => {
    const r = rightNow({
      hour: 12,
      hourTotals: [],
      recent: { clicks: 0, scrolls: 0, dwellsOver800: 0, rageClicks: 0 },
    });
    expect(r.components.hourBias).toBe(0);
  });

  it('recencyHeat scales with dwells', () => {
    const a = rightNow({
      hour: 12,
      hourTotals: flatHours,
      recent: { clicks: 0, scrolls: 0, dwellsOver800: 0, rageClicks: 0 },
    });
    const b = rightNow({
      hour: 12,
      hourTotals: flatHours,
      recent: { clicks: 0, scrolls: 0, dwellsOver800: 2, rageClicks: 0 },
    });
    expect(b.components.recencyHeat).toBeGreaterThan(a.components.recencyHeat);
  });

  it('out-of-range hour does not throw', () => {
    expect(() =>
      rightNow({
        hour: -1,
        hourTotals: flatHours,
        recent: { clicks: 0, scrolls: 0, dwellsOver800: 0, rageClicks: 0 },
      }),
    ).not.toThrow();
    expect(() =>
      rightNow({
        hour: 99,
        hourTotals: flatHours,
        recent: { clicks: 0, scrolls: 0, dwellsOver800: 0, rageClicks: 0 },
      }),
    ).not.toThrow();
  });

  it('quiet user (no signal anywhere) gets non-negative score from moodGuess only', () => {
    const r = rightNow({
      hour: 0,
      hourTotals: Array(24).fill(0),
      recent: { clicks: 0, scrolls: 0, dwellsOver800: 0, rageClicks: 0 },
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.components.moodGuess).toBe(1);
  });
});
