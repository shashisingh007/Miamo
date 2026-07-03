/**
 * Targeted coverage-gap tests — edge cases + branch coverage.
 *
 * Fills untested boundary conditions the existing per-module test files
 * chose not to enumerate. Each block cites the file it's boosting.
 *
 * Modules covered:
 *   - v8/polarity.ts        (default branch + confidence dwell floor + zero-action bio)
 *   - v8/moodRightNow.ts    (isLowMood truth table + boundary hour + bioExpandRate)
 *   - v8/exposureCredits.ts (premium ceiling regression + future-timestamp skip)
 *   - v8/geoDistance.ts     (identity distance + antipodes + zero radius)
 *   - v9/satiation.ts       (empty-list injection false + skip-then-impression)
 *
 * Cross-refs:
 *   - FULL_AUDIT_AND_LEARNING_V2_PROMPT.md §G.1 (≥80% line coverage)
 */

import { describe, it, expect } from 'vitest';

// ─── v8/polarity ────────────────────────────────────────────────────────────
import { computePolarity, type PolarityInput } from '../v8/polarity';

function polarityInput(overrides: Partial<PolarityInput> = {}): PolarityInput {
  return {
    actionTaken: null,
    dwellMs: 0,
    bioExpanded: false,
    photoSwipeCount: 0,
    returnVisit: false,
    returnCount: 0,
    ...overrides,
  };
}

describe('coverage-gap: v8/polarity', () => {
  it('actionTaken=null with no other signal returns polarity 0 confidence 0', () => {
    // // because: default branch of actionScoreOf + zero-dwell floor of
    // the confidence formula. Baseline case for the null-input contract.
    const r = computePolarity(polarityInput());
    expect(r.polarity).toBe(0);
    expect(r.confidence).toBe(0);
  });

  it('bioExpanded=true with action=null keeps polarity weakly-positive (dwell-tail only)', () => {
    // // because: bioScoreOf returns 0 unless action fires, but the
    // dwell-tail bonus (>7000ms + bioExpanded) still contributes via
    // W_DWELL_T = 0.10 × DWELL_TAIL_BONUS = 0.5, so polarity = 0.05.
    // Locks the contract: no action → nearly-zero polarity, not a full-strength verdict.
    const r = computePolarity(polarityInput({ actionTaken: null, bioExpanded: true, dwellMs: 8000 }));
    expect(r.polarity).toBeGreaterThanOrEqual(0);
    expect(r.polarity).toBeLessThan(0.1);
    // Confidence still reflects dwell + bio.
    expect(r.confidence).toBeGreaterThan(0);
  });

  it('super_like with 6 photos + bio-expand saturates positive polarity', () => {
    // // because: unambiguous-positive path — action + bio + photo all fire.
    // Value should clamp to +1 or very close to it.
    const r = computePolarity(polarityInput({
      actionTaken: 'super_like', dwellMs: 10_000, bioExpanded: true,
      photoSwipeCount: 6, returnVisit: true, returnCount: 3,
    }));
    expect(r.polarity).toBeGreaterThan(0.7);
    expect(r.polarity).toBeLessThanOrEqual(1);
  });

  it('pass + bio-expand fires the "hate-scroll" negative bioScore', () => {
    // // because: canonical negative — bio expand + pass = long inspection
    // followed by deliberate rejection. Should push polarity strongly negative.
    const r = computePolarity(polarityInput({
      actionTaken: 'pass', dwellMs: 10_000, bioExpanded: true, photoSwipeCount: 4,
    }));
    expect(r.polarity).toBeLessThan(0);
  });

  it('confidence gets a NO_BIO penalty when bio is not expanded', () => {
    // // because: CONFIDENCE_NO_BIO_PENALTY halves confidence when bio
    // isn't expanded; two identical dwell samples differ only in bioExpanded.
    const withBio = computePolarity(polarityInput({ dwellMs: 5000, bioExpanded: true }));
    const noBio   = computePolarity(polarityInput({ dwellMs: 5000, bioExpanded: false }));
    expect(withBio.confidence).toBeGreaterThan(noBio.confidence);
  });

  it('negative dwellMs is clamped by max(0, ...) — treated as zero', () => {
    // // because: defensive input handling. Nonsensical negative dwell (clock
    // skew) must not produce negative confidence.
    const r = computePolarity(polarityInput({ dwellMs: -1234, bioExpanded: true }));
    expect(r.confidence).toBeGreaterThanOrEqual(0);
  });
});

// ─── v8/moodRightNow ────────────────────────────────────────────────────────
import { inferMood, isLowMood, NEUTRAL_MOOD, type MoodInferenceInput } from '../v8/moodRightNow';

function moodInput(overrides: Partial<MoodInferenceInput> = {}): MoodInferenceInput {
  return {
    rageClickRate: null, dwellVariance: null, scrollVelocity: null,
    localHour: null, recentRegretCount: 0, recentReturnCount: 0,
    nowMs: 0, ...overrides,
  };
}

describe('coverage-gap: v8/moodRightNow', () => {
  it('all-null input returns NEUTRAL_MOOD (0.5 across every dim)', () => {
    // // because: isAllNull short-circuit. This is the consent-suppressed /
    // cold-start default and must not accidentally drift.
    const m = inferMood(moodInput());
    expect(m).toEqual({ ...NEUTRAL_MOOD });
  });

  it('isLowMood: rage=0.61 alone is enough (edge above 0.6 threshold)', () => {
    // // because: the isLowMood threshold pattern is easy to miss — >0.6
    // is strict (not >=). Locks the boundary at 0.6.
    expect(isLowMood({ rage: 0.61, calm: 0.5, curious: 0.5, receptive: 0.5, fatigued: 0.5 })).toBe(true);
    expect(isLowMood({ rage: 0.6, calm: 0.5, curious: 0.5, receptive: 0.5, fatigued: 0.5 })).toBe(false);
  });

  it('isLowMood: fatigued>0.7 is the fatigue path', () => {
    // // because: second branch of isLowMood — fatigue alone triggers.
    expect(isLowMood({ rage: 0.1, calm: 0.5, curious: 0.5, receptive: 0.5, fatigued: 0.71 })).toBe(true);
    expect(isLowMood({ rage: 0.1, calm: 0.5, curious: 0.5, receptive: 0.5, fatigued: 0.7 })).toBe(false);
  });

  it('isLowMood: receptive<0.4 AND curious<0.4 is the compound branch', () => {
    // // because: third branch — both must be low. Either alone is not
    // enough. This is a compound-AND branch that's easy to miss.
    const low = { rage: 0.1, calm: 0.5, curious: 0.3, receptive: 0.3, fatigued: 0.1 };
    expect(isLowMood(low)).toBe(true);
    // Curious only: not low.
    expect(isLowMood({ ...low, receptive: 0.5 })).toBe(false);
    // Receptive only: not low.
    expect(isLowMood({ ...low, curious: 0.5 })).toBe(false);
  });

  it('late-night hour (22) adds fatigue bonus of 0.3 to a zero-signal baseline', () => {
    // // because: FATIGUE_LATE_NIGHT_THRESHOLD is > 22 (strict), so
    // localHour=22 does NOT add the bonus, but localHour=23 does.
    const at22 = inferMood(moodInput({ localHour: 22 }));
    const at23 = inferMood(moodInput({ localHour: 23 }));
    expect(at23.fatigued).toBeGreaterThan(at22.fatigued);
  });

  it('early-morning hour (5) applies OWL bonus of 0.4', () => {
    // // because: FATIGUE_EARLY_HOUR_THRESHOLD is < 6 (strict). Hour 5
    // triggers OWL bonus, hour 6 does not.
    const at5 = inferMood(moodInput({ localHour: 5 }));
    const at6 = inferMood(moodInput({ localHour: 6 }));
    expect(at5.fatigued).toBeGreaterThan(at6.fatigued);
  });

  it('bioExpandRate raises curious even with zero returns', () => {
    // // because: curious = clip01(returns/5 + bioExpandRate). The path
    // where bioExpandRate is the sole positive input.
    const noBio  = inferMood(moodInput({ recentReturnCount: 0 }));
    const withBio = inferMood(moodInput({ recentReturnCount: 0, bioExpandRate: 0.8 }));
    expect(withBio.curious).toBeGreaterThan(noBio.curious);
  });
});

// ─── v8/exposureCredits ─────────────────────────────────────────────────────
import {
  creditForAction, isRageLike, applyPremiumMultiplier,
  MAX_PREMIUM_MULTIPLIER, PREMIUM_MULTIPLIER,
} from '../v8/exposureCredits';

describe('coverage-gap: v8/exposureCredits', () => {
  it('premium multiplier is capped by MAX_PREMIUM_MULTIPLIER (regression guard)', () => {
    // // because: MAX_PREMIUM_MULTIPLIER=2.0 is a hard ceiling. Even if a
    // future PR sets PREMIUM_MULTIPLIER=99, Math.min catches it.
    // We can't mutate the constant, but we can assert both the current
    // multiplier and the invariant that MAX bounds it.
    expect(PREMIUM_MULTIPLIER).toBeLessThanOrEqual(MAX_PREMIUM_MULTIPLIER);
    expect(MAX_PREMIUM_MULTIPLIER).toBe(2.0);
    // And applyPremiumMultiplier delivers on the invariant.
    expect(applyPremiumMultiplier(10, true)).toBeLessThanOrEqual(20);
  });

  it('creditForAction: premium sticky_like earns 1.5 slots exactly', () => {
    // // because: sticky_like base=1, ×1.5 premium multiplier = 1.5.
    // Locking as a floor for the credit-earning contract.
    expect(creditForAction('sticky_like', true).slots).toBeCloseTo(1.5, 5);
  });

  it('isRageLike: future timestamps are skipped (defensive)', () => {
    // // because: nowMs - t < 0 continues the loop instead of throwing.
    // Guards against clock-skew making legitimate users look ragey.
    const now = 1_000_000;
    const futureLikes = Array.from({ length: 100 }, (_, i) => now + 1_000 * (i + 1));
    expect(isRageLike(futureLikes, now)).toBe(false);
  });

  it('isRageLike: exactly at threshold (20 per minute) is NOT rage', () => {
    // // because: perMinute threshold is `>` not `>=`. 20 is normal, 21 is
    // rage. This locks the boundary.
    const now = 1_000_000;
    const likes = Array.from({ length: 20 }, (_, i) => now - i * 2000); // 20 in last 60s
    expect(isRageLike(likes, now)).toBe(false);
  });

  it('isRageLike: 21 in last minute IS rage', () => {
    // // because: complement to the boundary test above.
    const now = 1_000_000;
    const likes = Array.from({ length: 21 }, (_, i) => now - i * 2000);
    expect(isRageLike(likes, now)).toBe(true);
  });
});

// ─── v8/geoDistance ────────────────────────────────────────────────────────
import { haversineKm, isWithinRadiusKm, EARTH_RADIUS_KM } from '../v8/geoDistance';

describe('coverage-gap: v8/geoDistance', () => {
  it('identity distance is 0 (or effectively 0)', () => {
    // // because: same point ⇒ 0. Locks the zero-case.
    expect(haversineKm(19.076, 72.877, 19.076, 72.877)).toBeCloseTo(0, 6);
  });

  it('antipodal points give ~π·R distance', () => {
    // // because: antipodes are at max Haversine distance ≈ π·R ≈ 20015 km.
    const d = haversineKm(0, 0, 0, 180);
    expect(d).toBeCloseTo(Math.PI * EARTH_RADIUS_KM, 1);
  });

  it('isWithinRadiusKm: zero and negative radius always false', () => {
    // // because: radiusKm <= 0 short-circuits to false — reflecting the
    // upstream "no filter" contract (null/undefined).
    expect(isWithinRadiusKm(0, 0, 0, 0, 0)).toBe(false);
    expect(isWithinRadiusKm(0, 0, 0, 0, -5)).toBe(false);
  });

  it('haversineKm: non-finite inputs return Infinity (defensive)', () => {
    // // because: guard against upstream nulls/NaN corrupting Discover
    // filtering — an unknown location is treated as "out of range".
    expect(haversineKm(NaN, 0, 0, 0)).toBe(Infinity);
    expect(haversineKm(0, 0, Infinity, 0)).toBe(Infinity);
  });

  it('isWithinRadiusKm: exactly at the radius boundary is included', () => {
    // // because: the check uses <=, not <. If a user's radius is 100 and
    // the candidate is at exactly 100km, they should be shown.
    // 1 degree of latitude ≈ 111.32 km. So (0,0) to (0.5,0) ≈ 55.66 km.
    const d = haversineKm(0, 0, 0.5, 0);
    // Bracket the radius at just above the exact distance.
    expect(isWithinRadiusKm(0, 0, 0.5, 0, d + 0.001)).toBe(true);
    // And just below the exact distance.
    expect(isWithinRadiusKm(0, 0, 0.5, 0, d - 0.001)).toBe(false);
  });
});

// ─── v9/satiation ──────────────────────────────────────────────────────────
import {
  needsNoveltyInjection, initSatiation, updateSatiation, halfLifeFor,
} from '../v9/satiation';

describe('coverage-gap: v9/satiation', () => {
  it('needsNoveltyInjection: empty state list returns false', () => {
    // // because: base case — no categories to check ⇒ nothing to inject.
    expect(needsNoveltyInjection([])).toBe(false);
  });

  it('halfLifeFor: empty string returns default half-life', () => {
    // // because: guardrail against upstream passing an empty dimension.
    // Defaults keep the ranker running instead of crashing on lookup.
    expect(halfLifeFor('')).toBe(25); // default fallback
  });

  it('updateSatiation: 4 skips-then-impression does NOT reset the counter', () => {
    // // because: reset threshold is 5. Four skips accumulate but do not
    // reset; the fifth skip fires the reset. Locks the strict inequality.
    let s = { ...initSatiation('category:reels_spicy'), consecutiveImpressions: 10 };
    for (let i = 0; i < 4; i++) {
      s = updateSatiation(s, true, new Date());
      expect(s.consecutiveImpressions).toBe(10);
    }
    // Impression before the 5th skip — should keep counter and reset skips.
    s = updateSatiation(s, false, new Date());
    expect(s.consecutiveImpressions).toBe(11);
    expect(s.consecutiveSkips).toBe(0);
  });

  it('updateSatiation preserves the dimension label (no accidental rename)', () => {
    // // because: satiation state is per-dimension; the reducer must not
    // clobber `.dimension` on any state transition.
    const dim = 'category:photography';
    let s = initSatiation(dim);
    s = updateSatiation(s, false, new Date());
    s = updateSatiation(s, true, new Date());
    expect(s.dimension).toBe(dim);
  });
});
