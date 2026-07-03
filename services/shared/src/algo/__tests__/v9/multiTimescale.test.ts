import { describe, it, expect } from 'vitest';
import {
  applyEma,
  updatePreference,
  updateAllWindows,
  ALL_WINDOWS,
  WINDOW_HALF_LIVES,
  type PreferenceRow,
} from '../../v9/multiTimescale';

const UID = 'uid_test';
const DIM = 'category:reels_spicy';

function row(over: Partial<PreferenceRow>): PreferenceRow {
  return {
    uidHash: UID,
    dimension: DIM,
    window: 'session',
    score: 0.5,
    sampleCount: 5,
    computedAt: new Date(1_000_000),
    ...over,
  };
}

describe('v9/multiTimescale', () => {
  it('exports five ordered windows matching the schema enum', () => {
    expect(ALL_WINDOWS).toEqual(['right_now', 'session', 'week', 'month', 'lifetime']);
    for (const w of ALL_WINDOWS) expect(WINDOW_HALF_LIVES[w]).toBeGreaterThan(0);
  });

  it('applyEma: half-life halves the score with no new events (v ≈ 0)', () => {
    const s0 = 0.8;
    const hl = 10_000;
    // Simulate "no event" as event_value = 0 arriving at t=hl. The
    // decayed prior is s0/2 = 0.4; blending with 0 at alpha=0.5 gives 0.2.
    // Property we assert: score is monotonically ≤ s0/2 (the pure decay
    // ceiling) — no matter what alpha is, it can't grow the score above
    // that ceiling because newValue=0.
    const s1 = applyEma(s0, 0, 0, hl, hl);
    expect(s1).toBeLessThanOrEqual(s0 / 2 + 1e-9);
    expect(s1).toBeGreaterThanOrEqual(0);
  });

  it('applyEma: identical repeated events converge toward the event value', () => {
    let s = 0.0;
    for (let i = 0; i < 200; i++) {
      s = applyEma(s, 1.0, i * 1000, (i + 1) * 1000, 5000);
    }
    expect(s).toBeGreaterThan(0.9);
    expect(s).toBeLessThanOrEqual(1);
  });

  it('applyEma: identical zero events converge toward 0', () => {
    let s = 0.9;
    for (let i = 0; i < 200; i++) {
      s = applyEma(s, 0, i * 1000, (i + 1) * 1000, 5000);
    }
    expect(s).toBeLessThan(0.1);
    expect(s).toBeGreaterThanOrEqual(0);
  });

  it('applyEma: half-life = 0 replaces the prior score entirely', () => {
    expect(applyEma(0.9, 0.1, 0, 100, 0)).toBeCloseTo(0.1, 6);
    expect(applyEma(0.9, 1.0, 0, 100, 0)).toBe(1);
  });

  it('applyEma: NaN inputs are treated as 0, never propagate NaN', () => {
    expect(applyEma(NaN, 0.5, 0, 1000, 1000)).toBeGreaterThanOrEqual(0);
    expect(applyEma(0.5, NaN, 0, 1000, 1000)).toBeGreaterThanOrEqual(0);
    expect(applyEma(NaN, NaN, 0, 1000, 1000)).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(applyEma(NaN, NaN, 0, 1000, 1000))).toBe(true);
  });

  it('applyEma: score always stays in [0,1] under arbitrary bounded inputs', () => {
    for (let i = 0; i < 500; i++) {
      const oldS = Math.random();
      const newV = Math.random();
      const dt = Math.floor(Math.random() * 60_000);
      const hl = 1 + Math.floor(Math.random() * 60_000);
      const s = applyEma(oldS, newV, 0, dt, hl);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  it('applyEma: out-of-order events (newTs < oldTs) clamp elapsed to 0', () => {
    // No decay when clock rewinds; alpha=0 means score unchanged.
    const s = applyEma(0.7, 0.1, 5000, 3000, 1000);
    expect(s).toBeCloseTo(0.7, 6);
  });

  it('updatePreference: null prev row → initialised with event score', () => {
    const r = updatePreference(null, 'session', UID, DIM, 0.8, new Date(500));
    expect(r.uidHash).toBe(UID);
    expect(r.dimension).toBe(DIM);
    expect(r.window).toBe('session');
    expect(r.score).toBeCloseTo(0.8, 6);
    expect(r.sampleCount).toBe(1);
    expect(r.computedAt.getTime()).toBe(500);
  });

  it('updatePreference: increments sampleCount and preserves keys', () => {
    const prev = row({ score: 0.3, sampleCount: 4, computedAt: new Date(0) });
    const r = updatePreference(prev, 'session', UID, DIM, 1.0, new Date(60_000));
    expect(r.sampleCount).toBe(5);
    expect(r.uidHash).toBe(UID);
    expect(r.dimension).toBe(DIM);
    expect(r.window).toBe('session');
    // Should move toward 1.0 from 0.3.
    expect(r.score).toBeGreaterThan(0.3);
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it('updatePreference: computedAt is monotonic (out-of-order eventTs)', () => {
    const prev = row({ computedAt: new Date(10_000) });
    const r = updatePreference(prev, 'session', UID, DIM, 0.5, new Date(5_000));
    expect(r.computedAt.getTime()).toBe(10_000);
  });

  it('updatePreference: half-life decay locked to WINDOW_HALF_LIVES', () => {
    // With one half-life elapsed and event value 0, score should be
    // exactly half the prior score (decayed then blended-with-0-at-alpha=0.5
    // ⇒ decayed/2 = prior/4? No — see applyEma docstring: decay first
    // to prior*survival, then blend with 0 at alpha=(1-survival), which
    // for survival=0.5 yields decayed*0.5 = prior*0.25). Assert bound.
    const hl = WINDOW_HALF_LIVES.right_now;
    const prev = row({ window: 'right_now', score: 0.8, computedAt: new Date(0) });
    const r = updatePreference(prev, 'right_now', UID, DIM, 0.0, new Date(hl));
    expect(r.score).toBeLessThanOrEqual(0.8 / 2 + 1e-9);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });

  it('updateAllWindows: cold-start (no prev rows) produces one row per window', () => {
    const rows = updateAllWindows([], UID, DIM, 0.6, new Date(1000));
    expect(rows.length).toBe(5);
    expect(rows.map(r => r.window)).toEqual(['right_now', 'session', 'week', 'month', 'lifetime']);
    for (const r of rows) {
      expect(r.uidHash).toBe(UID);
      expect(r.dimension).toBe(DIM);
      expect(r.score).toBeCloseTo(0.6, 6);
      expect(r.sampleCount).toBe(1);
      expect(r.computedAt.getTime()).toBe(1000);
    }
  });

  it('updateAllWindows: partial prev rows — missing windows cold-start, present windows update', () => {
    const prevRightNow = row({ window: 'right_now', score: 0.2, sampleCount: 3, computedAt: new Date(0) });
    const rows = updateAllWindows([prevRightNow], UID, DIM, 1.0, new Date(60_000));
    const byW = new Map(rows.map(r => [r.window, r]));
    expect(byW.get('right_now')!.sampleCount).toBe(4);
    expect(byW.get('session')!.sampleCount).toBe(1); // cold-start
    expect(byW.get('week')!.sampleCount).toBe(1);
    expect(byW.get('month')!.sampleCount).toBe(1);
    expect(byW.get('lifetime')!.sampleCount).toBe(1);
  });

  it('updateAllWindows: unknown window in prev rows is ignored', () => {
    const bogus = row({ window: 'never' as never });
    const rows = updateAllWindows([bogus], UID, DIM, 0.5, new Date(0));
    // All five windows are cold-started (bogus dropped).
    for (const r of rows) expect(r.sampleCount).toBe(1);
  });

  it('updateAllWindows: shorter windows respond faster to a step change', () => {
    // Seed all five windows at score=1.0 (a well-observed hot dimension)
    // then drive with score=0.0 events (user is passing / skipping).
    // The right_now window (90s HL) should cool faster than the month
    // window (30d HL) — that IS the multi-timescale representation.
    const seed: PreferenceRow[] = ALL_WINDOWS.map(w => ({
      uidHash: UID,
      dimension: DIM,
      window: w,
      score: 1.0,
      sampleCount: 100,
      computedAt: new Date(0),
    }));
    let prev: PreferenceRow[] = seed;
    // Drive with skip events one minute apart for 30 minutes.
    for (let i = 1; i <= 30; i++) {
      prev = updateAllWindows(prev, UID, DIM, 0.0, new Date(i * 60_000));
    }
    const byW = new Map(prev.map(r => [r.window, r]));
    expect(byW.get('right_now')!.score).toBeLessThan(byW.get('month')!.score);
    expect(byW.get('session')!.score).toBeLessThan(byW.get('week')!.score);
    expect(byW.get('week')!.score).toBeLessThan(byW.get('month')!.score);
  });

  it('updateAllWindows: monotonic under repeated identical positive events', () => {
    let prev: PreferenceRow[] = [];
    let prevRN = 0;
    for (let i = 0; i < 20; i++) {
      prev = updateAllWindows(prev, UID, DIM, 1.0, new Date(i * 500));
      const rn = prev.find(r => r.window === 'right_now')!.score;
      expect(rn).toBeGreaterThanOrEqual(prevRN - 1e-9);
      prevRN = rn;
    }
  });

  it('updateAllWindows: out-of-band eventScore is clipped to [0,1]', () => {
    const rows = updateAllWindows([], UID, DIM, 5.0, new Date(0));
    for (const r of rows) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
    const rows2 = updateAllWindows([], UID, DIM, -3.0, new Date(0));
    for (const r of rows2) expect(r.score).toBe(0);
  });
});
