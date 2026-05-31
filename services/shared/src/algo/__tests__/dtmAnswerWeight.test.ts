import { describe, it, expect } from 'vitest';
import { dtmAnswerWeight } from '../dtmAnswerWeight';

describe('dtmAnswerWeight', () => {
  it('returns the floor (0.20) for explicit skips regardless of other inputs', () => {
    expect(dtmAnswerWeight({ latencyMs: 4000, editCount: 0, wasSkip: true })).toBe(0.20);
  });
  it('peaks in the 1500\u20136000ms sweet spot with no edits', () => {
    expect(dtmAnswerWeight({ latencyMs: 3000, editCount: 0 })).toBe(1.00);
  });
  it('penalises sub-600ms taps as low-confidence', () => {
    const w = dtmAnswerWeight({ latencyMs: 200, editCount: 0 });
    expect(w).toBe(0.40);
  });
  it('penalises slow (>30s) answers as distracted', () => {
    expect(dtmAnswerWeight({ latencyMs: 60_000, editCount: 0 })).toBe(0.40);
  });
  it('applies an edit penalty', () => {
    expect(dtmAnswerWeight({ latencyMs: 3000, editCount: 1 })).toBeCloseTo(0.85, 6);
    expect(dtmAnswerWeight({ latencyMs: 3000, editCount: 2 })).toBeCloseTo(0.70, 6);
    expect(dtmAnswerWeight({ latencyMs: 3000, editCount: 5 })).toBeCloseTo(0.50, 6);
  });
  it('applies fatigue dampening', () => {
    const base = dtmAnswerWeight({ latencyMs: 3000, editCount: 0 });
    const tired = dtmAnswerWeight({ latencyMs: 3000, editCount: 0, fatigueRisk: true });
    expect(tired).toBeCloseTo(base * 0.80, 6);
  });
  it('never returns above 1.00 or below 0.20', () => {
    for (const ms of [0, 100, 500, 2000, 8000, 20000, 60000, NaN, -1]) {
      const w = dtmAnswerWeight({ latencyMs: ms, editCount: 0 });
      expect(w).toBeGreaterThanOrEqual(0.20);
      expect(w).toBeLessThanOrEqual(1.00);
    }
  });
  it('compounded edit + fatigue still respects floor', () => {
    const w = dtmAnswerWeight({ latencyMs: 50_000, editCount: 9, fatigueRisk: true });
    expect(w).toBe(0.20);
  });
});
