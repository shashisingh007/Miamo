import { describe, it, expect } from 'vitest';
import {
  detectDrift,
  directionFromDelta,
  signalForDimension,
  DRIFT_THRESHOLD,
  DRIFT_MIN_SAMPLES,
  DRIFT_CONFIDENCE_CAP,
  type DriftSignal,
} from '../../v9/driftDetector';
import type { PreferenceRow, PreferenceWindow } from '../../v9/multiTimescale';

const UID = 'uid_test';

function row(dim: string, w: PreferenceWindow, score: number, sc = 10): PreferenceRow {
  return {
    uidHash: UID,
    dimension: dim,
    window: w,
    score,
    sampleCount: sc,
    computedAt: new Date(0),
  };
}

describe('v9/driftDetector', () => {
  it('directionFromDelta: threshold semantics', () => {
    expect(directionFromDelta(-0.5)).toBe('cooling');
    expect(directionFromDelta( 0.5)).toBe('warming');
    expect(directionFromDelta(0)).toBe('stable');
    expect(directionFromDelta(-DRIFT_THRESHOLD)).toBe('stable');
    expect(directionFromDelta( DRIFT_THRESHOLD)).toBe('stable');
    expect(directionFromDelta(-DRIFT_THRESHOLD - 1e-6)).toBe('cooling');
    expect(directionFromDelta( DRIFT_THRESHOLD + 1e-6)).toBe('warming');
  });

  it('Priya case: month=0.85, week=0.60, session=0.15, rightNow=0.10 → cooling, ~0.70, high confidence', () => {
    const dim = 'category:reels_spicy';
    const history: PreferenceRow[] = [
      row(dim, 'month',     0.85, 200),
      row(dim, 'week',      0.60, 60),
      row(dim, 'session',   0.15, 12),
      row(dim, 'right_now', 0.10, 8),
    ];
    const signals = detectDrift(history);
    expect(signals.length).toBe(1);
    const s = signals[0];
    expect(s.driftDirection).toBe('cooling');
    expect(s.driftMagnitude).toBeCloseTo(0.70, 6);
    expect(s.confidence).toBe(1); // 200+60+12+8 = 280 > DRIFT_CONFIDENCE_CAP
    expect(s.monthScore).toBe(0.85);
    expect(s.sessionScore).toBe(0.15);
  });

  it('Karan case: stable serious-search behaviour → no drift', () => {
    const dim = 'archetype:serious_search';
    const history: PreferenceRow[] = [
      row(dim, 'month',     0.75, 80),
      row(dim, 'week',      0.78, 40),
      row(dim, 'session',   0.72, 15),
      row(dim, 'right_now', 0.74, 10),
    ];
    const signals = detectDrift(history);
    expect(signals.length).toBe(1);
    expect(signals[0].driftDirection).toBe('stable');
    expect(signals[0].driftMagnitude).toBeLessThan(DRIFT_THRESHOLD);
  });

  it('warming case: dormant interest reactivates → warming', () => {
    const dim = 'hook:travel';
    const history: PreferenceRow[] = [
      row(dim, 'month',     0.20, 40),
      row(dim, 'week',      0.30, 20),
      row(dim, 'session',   0.85, 15),
      row(dim, 'right_now', 0.90, 10),
    ];
    const signals = detectDrift(history);
    expect(signals[0].driftDirection).toBe('warming');
    // max(|0.20-0.85|, |0.30-0.90|) = 0.65
    expect(signals[0].driftMagnitude).toBeCloseTo(0.65, 6);
  });

  it('confidence: below DRIFT_MIN_SAMPLES → confidence=0', () => {
    const dim = 'category:rare';
    const history: PreferenceRow[] = [
      row(dim, 'month',   0.9, 2),
      row(dim, 'session', 0.1, 2),
    ];
    const signals = detectDrift(history);
    expect(signals[0].confidence).toBe(0);
    // Direction still computed — caller decides whether to trust it.
    expect(signals[0].driftDirection).toBe('cooling');
  });

  it('confidence: scales linearly toward DRIFT_CONFIDENCE_CAP', () => {
    const dim = 'category:mid';
    // 10 + 10 = 20 total samples → confidence = 20/20 = 1.0
    const s1 = signalForDimension(dim, {
      month: row(dim, 'month', 0.9, 10),
      session: row(dim, 'session', 0.9, 10),
    })!;
    expect(s1.confidence).toBe(1);
    // 5 + 5 = 10 → confidence = 10/20 = 0.5
    const s2 = signalForDimension(dim, {
      month: row(dim, 'month', 0.9, 5),
      session: row(dim, 'session', 0.9, 5),
    })!;
    expect(s2.confidence).toBe(0.5);
  });

  it('missing month window: falls back to week-vs-rightNow pair', () => {
    const dim = 'hook:hiking';
    const history: PreferenceRow[] = [
      row(dim, 'week',      0.8, 20),
      row(dim, 'right_now', 0.1, 10),
    ];
    const signals = detectDrift(history);
    expect(signals.length).toBe(1);
    expect(signals[0].driftDirection).toBe('cooling');
    expect(signals[0].driftMagnitude).toBeCloseTo(0.7, 6);
  });

  it('missing week+rightNow window: month-vs-session pair still works', () => {
    const dim = 'category:memes';
    const history: PreferenceRow[] = [
      row(dim, 'month',   0.9, 40),
      row(dim, 'session', 0.2, 12),
    ];
    const signals = detectDrift(history);
    expect(signals.length).toBe(1);
    expect(signals[0].driftDirection).toBe('cooling');
  });

  it('only one window present: no comparison pair → no signal', () => {
    const dim = 'category:tenuous';
    const history: PreferenceRow[] = [row(dim, 'month', 0.9, 20)];
    const signals = detectDrift(history);
    expect(signals.length).toBe(0);
  });

  it('multiple dimensions in one history: one signal per dimension', () => {
    const history: PreferenceRow[] = [
      row('a', 'month', 0.9, 40), row('a', 'session', 0.9, 20),
      row('b', 'month', 0.9, 40), row('b', 'session', 0.1, 20),
      row('c', 'month', 0.1, 40), row('c', 'session', 0.9, 20),
    ];
    const signals = detectDrift(history);
    const byDim = new Map(signals.map(s => [s.dimension, s]));
    expect(byDim.get('a')!.driftDirection).toBe('stable');
    expect(byDim.get('b')!.driftDirection).toBe('cooling');
    expect(byDim.get('c')!.driftDirection).toBe('warming');
  });

  it('magnitude uses max(|month-session|, |week-rightNow|)', () => {
    // month vs session says stable (delta -0.1), week vs rightNow says cooling (delta -0.6).
    // The max-magnitude comparison should surface -0.6 → cooling, 0.6.
    const dim = 'category:mixed_signal';
    const history: PreferenceRow[] = [
      row(dim, 'month',     0.60, 20),
      row(dim, 'week',      0.80, 20),
      row(dim, 'session',   0.50, 20),
      row(dim, 'right_now', 0.20, 20),
    ];
    const signals = detectDrift(history);
    expect(signals[0].driftDirection).toBe('cooling');
    expect(signals[0].driftMagnitude).toBeCloseTo(0.60, 6);
  });

  it('magnitude clipped to [0,1] under out-of-range scores', () => {
    // Should never happen (scores are clipped upstream) but defensive.
    const dim = 'x';
    const s = signalForDimension(dim, {
      month:   row(dim, 'month', 1.0, 20),
      session: row(dim, 'session', 0.0, 20),
    })!;
    expect(s.driftMagnitude).toBeLessThanOrEqual(1);
    expect(s.driftMagnitude).toBeGreaterThanOrEqual(0);
  });

  it('empty history: returns empty array', () => {
    expect(detectDrift([])).toEqual([]);
  });

  it('signalForDimension returns null when no pair available', () => {
    const dim = 'x';
    expect(signalForDimension(dim, {})).toBe(null);
    expect(signalForDimension(dim, { month: row(dim, 'month', 0.5, 10) })).toBe(null);
    expect(signalForDimension(dim, { week: row(dim, 'week', 0.5, 10) })).toBe(null);
  });
});

// Also ensure exports we care about
describe('v9/driftDetector constants', () => {
  it('DRIFT_THRESHOLD is 0.3 per D.2 spec', () => {
    expect(DRIFT_THRESHOLD).toBe(0.3);
  });
  it('DRIFT_MIN_SAMPLES is 10 per D.2 spec', () => {
    expect(DRIFT_MIN_SAMPLES).toBe(10);
  });
  it('DRIFT_CONFIDENCE_CAP is 20 (matches D.2 confidence formula)', () => {
    expect(DRIFT_CONFIDENCE_CAP).toBe(20);
  });
  it('DriftSignal type is exported (compile-time smoke)', () => {
    const _: DriftSignal | null = null;
    void _;
    expect(true).toBe(true);
  });
});
