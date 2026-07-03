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

describe('v8/multiObjective — v9 temporal-learning integration (flag gated)', () => {
  const withFlag = (on: boolean, fn: () => void): void => {
    const prev = process.env.ALGO_V9_TEMPORAL_LEARNING_ENABLED;
    process.env.ALGO_V9_TEMPORAL_LEARNING_ENABLED = on ? '1' : '0';
    try { fn(); }
    finally {
      if (prev === undefined) delete process.env.ALGO_V9_TEMPORAL_LEARNING_ENABLED;
      else process.env.ALGO_V9_TEMPORAL_LEARNING_ENABLED = prev;
    }
  };

  it('flag OFF: noveltyDemand & driftDampen are ignored (behaviour unchanged)', () => {
    withFlag(false, () => {
      const withNovelty = scoreMultiObjective({
        relevance: 1, earnedVisibilityBoost: 0, fairnessFloor: 0, recencyFreshness: 0, intentFitRightNow: 0,
        noveltyDemand: 1, driftDampen: 1,
      });
      const withoutNovelty = scoreMultiObjective({
        relevance: 1, earnedVisibilityBoost: 0, fairnessFloor: 0, recencyFreshness: 0, intentFitRightNow: 0,
      });
      expect(withNovelty).toBeCloseTo(withoutNovelty, 9);
    });
  });

  it('flag ON: noveltyDemand adjusts the score', () => {
    withFlag(true, () => {
      const highNovelty = scoreMultiObjective({
        relevance: 1, earnedVisibilityBoost: 1, fairnessFloor: 1, recencyFreshness: 1, intentFitRightNow: 1,
        noveltyDemand: 1,
      });
      // All at 1 → still 1 (weighted average of ones is 1).
      expect(highNovelty).toBeCloseTo(1, 6);

      const zeroNovelty = scoreMultiObjective({
        relevance: 1, earnedVisibilityBoost: 1, fairnessFloor: 1, recencyFreshness: 1, intentFitRightNow: 1,
        noveltyDemand: 0,
      });
      // noveltyDemand=0 with weight 0.05: (1 * 0.95 + 0 * 0.05) = 0.95
      expect(zeroNovelty).toBeLessThan(1);
      expect(zeroNovelty).toBeGreaterThan(0.9);
    });
  });

  it('flag ON: driftDampen reduces the final score', () => {
    withFlag(true, () => {
      const noDrift = scoreMultiObjective({
        relevance: 1, earnedVisibilityBoost: 0, fairnessFloor: 0, recencyFreshness: 0, intentFitRightNow: 0,
      });
      const cooling = scoreMultiObjective({
        relevance: 1, earnedVisibilityBoost: 0, fairnessFloor: 0, recencyFreshness: 0, intentFitRightNow: 0,
        driftDampen: 1.0,
      });
      // driftDampen 1.0 with strength 0.15 removes 15%.
      expect(cooling).toBeLessThan(noDrift);
      expect(cooling).toBeCloseTo(noDrift * 0.85, 6);
    });
  });

  it('flag ON: null noveltyDemand drops cleanly (compose pattern)', () => {
    withFlag(true, () => {
      const s = scoreMultiObjective({
        relevance: 1, earnedVisibilityBoost: 1, fairnessFloor: 1, recencyFreshness: 1, intentFitRightNow: 1,
        noveltyDemand: null,
      });
      // Everything else is 1 → compose still 1.
      expect(s).toBeCloseTo(1, 6);
    });
  });
});

// v9 Phase E integration — profileHealth + repeatOffender flag gating.
describe('v8/multiObjective — v9 Phase E flag gating (profileHealth + repeatOffender)', () => {
  const KEYS = [
    'ALGO_V9_TEMPORAL_LEARNING_ENABLED',
    'ALGO_V9_PROFILE_HEALTH_ENABLED',
    'ALGO_V9_REPEAT_OFFENDER_ENABLED',
  ] as const;

  const withFlags = (values: Partial<Record<(typeof KEYS)[number], '1' | '0'>>, fn: () => void): void => {
    const prev: Record<string, string | undefined> = {};
    for (const k of KEYS) prev[k] = process.env[k];
    for (const k of KEYS) {
      const v = values[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    try { fn(); }
    finally {
      for (const k of KEYS) {
        if (prev[k] === undefined) delete process.env[k];
        else process.env[k] = prev[k];
      }
    }
  };

  it('all v9 flags OFF: profileHealthPenalty & repeatOffenderDampen are ignored (bit-identical)', () => {
    withFlags({}, () => {
      const baseline = scoreMultiObjective({
        relevance: 0.8, earnedVisibilityBoost: 0.1, fairnessFloor: 0.3,
        recencyFreshness: 0.4, intentFitRightNow: 0.6,
      });
      const withPhE = scoreMultiObjective({
        relevance: 0.8, earnedVisibilityBoost: 0.1, fairnessFloor: 0.3,
        recencyFreshness: 0.4, intentFitRightNow: 0.6,
        profileHealthPenalty: 0.25,
        repeatOffenderDampen: 0.6,
      });
      expect(withPhE).toBe(baseline);
    });
  });

  it('flag ON: profileHealthPenalty > 0 reduces the composed score', () => {
    withFlags({ ALGO_V9_PROFILE_HEALTH_ENABLED: '1' }, () => {
      const clean = scoreMultiObjective({
        relevance: 1, earnedVisibilityBoost: 1, fairnessFloor: 1,
        recencyFreshness: 1, intentFitRightNow: 1,
        profileHealthPenalty: 0,
      });
      const ghosty = scoreMultiObjective({
        relevance: 1, earnedVisibilityBoost: 1, fairnessFloor: 1,
        recencyFreshness: 1, intentFitRightNow: 1,
        profileHealthPenalty: 0.3, // max penalty
      });
      expect(ghosty).toBeLessThan(clean);
      // clean at max penalty=0 → 1; ghosty at max penalty (contrib=0):
      // (1 * 0.95 + 0 * 0.05) = 0.95
      expect(clean).toBeCloseTo(1, 6);
      expect(ghosty).toBeCloseTo(0.95, 6);
    });
  });

  it('flag ON: profileHealthPenalty null is ignored (pattern-neutral)', () => {
    withFlags({ ALGO_V9_PROFILE_HEALTH_ENABLED: '1' }, () => {
      const withNull = scoreMultiObjective({
        relevance: 0.7, earnedVisibilityBoost: 0.2, fairnessFloor: 0.5,
        recencyFreshness: 0.5, intentFitRightNow: 0.5,
        profileHealthPenalty: null,
      });
      const flagOff = scoreMultiObjective({
        relevance: 0.7, earnedVisibilityBoost: 0.2, fairnessFloor: 0.5,
        recencyFreshness: 0.5, intentFitRightNow: 0.5,
      });
      expect(withNull).toBeCloseTo(flagOff, 9);
    });
  });

  it('flag ON: repeatOffenderDampen scales the final score multiplicatively', () => {
    withFlags({ ALGO_V9_REPEAT_OFFENDER_ENABLED: '1' }, () => {
      const clean = scoreMultiObjective({
        relevance: 1, earnedVisibilityBoost: 0, fairnessFloor: 0,
        recencyFreshness: 0, intentFitRightNow: 0,
      });
      const damped = scoreMultiObjective({
        relevance: 1, earnedVisibilityBoost: 0, fairnessFloor: 0,
        recencyFreshness: 0, intentFitRightNow: 0,
        repeatOffenderDampen: 0.6,
      });
      expect(damped).toBeCloseTo(clean * 0.6, 6);
    });
  });

  it('both flags ON: combined effects compose as expected', () => {
    withFlags({
      ALGO_V9_PROFILE_HEALTH_ENABLED: '1',
      ALGO_V9_REPEAT_OFFENDER_ENABLED: '1',
    }, () => {
      const s = scoreMultiObjective({
        relevance: 1, earnedVisibilityBoost: 1, fairnessFloor: 1,
        recencyFreshness: 1, intentFitRightNow: 1,
        profileHealthPenalty: 0,       // no penalty
        repeatOffenderDampen: 0.5,     // 50% damp
      });
      // All ingredients at 1 → compose = 1. Dampener → 0.5.
      expect(s).toBeCloseTo(0.5, 6);
    });
  });

  it('flag OFF path: repeatOffenderDampen=0.5 does NOT reduce the score', () => {
    withFlags({}, () => {
      const noDamp = scoreMultiObjective({
        relevance: 1, earnedVisibilityBoost: 0, fairnessFloor: 0,
        recencyFreshness: 0, intentFitRightNow: 0,
      });
      const withDamp = scoreMultiObjective({
        relevance: 1, earnedVisibilityBoost: 0, fairnessFloor: 0,
        recencyFreshness: 0, intentFitRightNow: 0,
        repeatOffenderDampen: 0.5,
      });
      expect(withDamp).toBe(noDamp);
    });
  });
});
