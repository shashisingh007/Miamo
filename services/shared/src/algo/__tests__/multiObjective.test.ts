import { describe, it, expect } from 'vitest';
import { scoreMultiObjective, weightsSum, MO_WEIGHTS } from '../v8/multiObjective';

describe('v8/multiObjective — weights validity', () => {
  it('weights sum to 1.0 within float epsilon', () => {
    expect(Math.abs(weightsSum() - 1.0)).toBeLessThan(1e-9);
  });
  it('weights are all non-negative', () => {
    for (const v of Object.values(MO_WEIGHTS)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
  it('relevance is the largest weight (it dominates per §B.7.3)', () => {
    const max = Math.max(...Object.values(MO_WEIGHTS));
    expect(MO_WEIGHTS.relevance).toBe(max);
  });
});

describe('v8/multiObjective — scoreMultiObjective', () => {
  it('all-1.0 input → 1.0 output', () => {
    const s = scoreMultiObjective({
      relevance: 1,
      earnedVisibilityBoost: 1,
      fairnessFloor: 1,
      recencyFreshness: 1,
      intentFitRightNow: 1,
    });
    expect(s).toBeCloseTo(1, 6);
  });

  it('all-0 input → 0 output', () => {
    const s = scoreMultiObjective({
      relevance: 0,
      earnedVisibilityBoost: 0,
      fairnessFloor: 0,
      recencyFreshness: 0,
      intentFitRightNow: 0,
    });
    expect(s).toBe(0);
  });

  it('null intentFitRightNow drops cleanly (compose() pattern)', () => {
    // With intent null and all others 1, compose() renormalises remaining
    // weights to sum to 1 → output should still be 1.0.
    const s = scoreMultiObjective({
      relevance: 1,
      earnedVisibilityBoost: 1,
      fairnessFloor: 1,
      recencyFreshness: 1,
      intentFitRightNow: null,
    });
    expect(s).toBeCloseTo(1, 6);
  });

  it('null intentFitRightNow vs 0.5 changes the score', () => {
    const withIntent = scoreMultiObjective({
      relevance: 1, earnedVisibilityBoost: 1, fairnessFloor: 1, recencyFreshness: 1, intentFitRightNow: 0,
    });
    const withoutIntent = scoreMultiObjective({
      relevance: 1, earnedVisibilityBoost: 1, fairnessFloor: 1, recencyFreshness: 1, intentFitRightNow: null,
    });
    expect(withoutIntent).toBeGreaterThan(withIntent);
  });

  it('relevance dominates: high relevance + low others > low relevance + high others', () => {
    const high = scoreMultiObjective({
      relevance: 1, earnedVisibilityBoost: 0, fairnessFloor: 0, recencyFreshness: 0, intentFitRightNow: 0,
    });
    const low = scoreMultiObjective({
      relevance: 0, earnedVisibilityBoost: 1, fairnessFloor: 1, recencyFreshness: 1, intentFitRightNow: 1,
    });
    expect(high).toBeGreaterThan(low);
  });

  it('output is bounded [0, 1]', () => {
    const s = scoreMultiObjective({
      relevance: 0.5, earnedVisibilityBoost: 0.3, fairnessFloor: 0.7, recencyFreshness: 0.4, intentFitRightNow: 0.6,
    });
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });

  it('clips out-of-spec input (relevance > 1)', () => {
    const s = scoreMultiObjective({
      relevance: 2.5, // smuggled overflow
      earnedVisibilityBoost: 0, fairnessFloor: 0, recencyFreshness: 0, intentFitRightNow: 0,
    });
    // Even with relevance=∞, the clipped contribution is 0.55 (relevance weight).
    expect(s).toBeCloseTo(MO_WEIGHTS.relevance, 6);
  });

  it('clips out-of-spec input (negative values)', () => {
    const s = scoreMultiObjective({
      relevance: -0.5, earnedVisibilityBoost: 0, fairnessFloor: 0, recencyFreshness: 0, intentFitRightNow: 0,
    });
    expect(s).toBe(0); // clipped to 0 across the board.
  });

  it('is deterministic', () => {
    const inp = { relevance: 0.42, earnedVisibilityBoost: 0.13, fairnessFloor: 0.5, recencyFreshness: 0.7, intentFitRightNow: 0.3 };
    expect(scoreMultiObjective(inp)).toBe(scoreMultiObjective(inp));
  });

  it('matches manual computation for a known input', () => {
    const inp = {
      relevance: 1.0,
      earnedVisibilityBoost: 0.0,
      fairnessFloor: 0.0,
      recencyFreshness: 0.0,
      intentFitRightNow: 0.0,
    };
    // Manual: weights all present, only relevance fires at 1.0.
    // compose returns Σ(w_i * v_i) / Σ(w_i) = 0.55 / 1.0 = 0.55.
    expect(scoreMultiObjective(inp)).toBeCloseTo(MO_WEIGHTS.relevance, 6);
  });
});
