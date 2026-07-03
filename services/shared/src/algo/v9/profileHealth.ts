/**
 * v9 — Passive per-profile health score.
 *
 * Pure module. Given the observable inputs for one profile (photo count,
 * bio length, prompts filled, verified badge, 30-day response rate,
 * ghost rate, days since last active), returns:
 *
 *   healthScore  — 0..1, higher = more trustworthy
 *   penalty      — 0..0.3, ready to subtract from the candidate's final score
 *   reasons      — human-readable list of what contributed, for the explainer
 *
 * Feeds the multi-objective ranker as a small penalty (max 0.3 out of 1.0
 * of the composed score) for chronic ghosters. Brand-new profiles get the
 * benefit of the doubt: healthScore ≈ 0.7, penalty ≈ 0.
 *
 * Contract:
 *   - Pure, no I/O, no Date.now(). daysSinceLastActive is supplied.
 *   - Sum of positive contributions caps at 1.0, so a "perfect" profile
 *     has healthScore=1 and penalty=0.
 *   - The penalty is the *complement*: `(1 - healthScore) * MAX_PENALTY`.
 *
 * File: services/shared/src/algo/v9/profileHealth.ts
 * Flag: ALGO_V9_PROFILE_HEALTH_ENABLED
 */
import { clip01 } from '../math';

export interface ProfileHealthInput {
  photoCount: number;
  bioLengthChars: number;
  promptCount: number;
  verified: boolean;
  /** 30-day inbound → reply rate, [0,1]. */
  responseRate: number;
  /** matches with 0 messages / total matches, [0,1]. */
  ghostRate: number;
  daysSinceLastActive: number;
}

export interface ProfileHealthResult {
  healthScore: number;
  penalty: number;
  reasons: string[];
}

/**
 * Maximum multiplicative penalty subtracted from the compose output.
 * // because: the design spec caps profile-health influence at ~30% of
 * // any candidate's score so a matched-and-ghosted-once user is still
 * // recoverable. Anything larger and the ranker rediscovers the same
 * // problem inverted (users with one bad review get permanently sunk).
 */
export const MAX_PENALTY = 0.3;

/** Cold-start floor: brand-new profiles (no history) get this benefit. */
export const COLD_START_HEALTH = 0.7;

/** Ingredient contributions (positive weights sum to 1.0 for a "perfect" profile). */
const CONTRIB = {
  photos: 0.15,       // 3+ photos ⇒ full contribution
  bio: 0.15,          // 150+ chars ⇒ full contribution
  prompts: 0.15,      // 3+ prompts ⇒ full contribution
  verified: 0.10,     // binary
  responseRate: 0.20, // linear in [0,1]
  ghostRate: 0.15,    // 1 - ghostRate, linear
  active: 0.10,       // 1 when <14 days, decays to 0 by 60 days
} as const;

/** Contributions sum to 1.0 by construction; asserted by a unit test. */
export function healthContribSum(): number {
  let s = 0;
  for (const v of Object.values(CONTRIB)) s += v;
  return s;
}

/**
 * When a profile has essentially no signal (no photos, no bio, no
 * prompts, no reply history), we return the cold-start baseline
 * instead of a very low score. Otherwise a first-day user looks
 * worse than a chronic ghoster who happens to have 6 photos.
 */
function isColdStart(inp: ProfileHealthInput): boolean {
  const noContent = inp.photoCount <= 1 && inp.bioLengthChars < 40 && inp.promptCount === 0;
  const noHistory = inp.responseRate === 0 && inp.ghostRate === 0;
  return noContent && noHistory;
}

/**
 * Score a profile. Returns healthScore ∈ [0,1], penalty ∈ [0, MAX_PENALTY],
 * and a list of reasons that the compatibilityExplainer / debug endpoint
 * can render for on-call and for the "why am I seeing this" card.
 */
export function scoreProfileHealth(inp: ProfileHealthInput): ProfileHealthResult {
  if (isColdStart(inp)) {
    return {
      healthScore: COLD_START_HEALTH,
      penalty: (1 - COLD_START_HEALTH) * MAX_PENALTY,
      reasons: ['new profile — benefit of the doubt'],
    };
  }

  const reasons: string[] = [];
  let health = 0;

  // Photos — linear ramp from 0 to 3 photos.
  const photoRatio = Math.min(1, inp.photoCount / 3);
  health += CONTRIB.photos * photoRatio;
  if (inp.photoCount === 0) reasons.push('no photos');
  else if (inp.photoCount >= 3) reasons.push(`${inp.photoCount} photos`);

  // Bio — linear ramp from 0 to 150 chars.
  const bioRatio = Math.min(1, inp.bioLengthChars / 150);
  health += CONTRIB.bio * bioRatio;
  if (inp.bioLengthChars < 40) reasons.push('short bio');
  else if (inp.bioLengthChars >= 150) reasons.push('rich bio');

  // Prompts — linear ramp from 0 to 3 prompts.
  const promptRatio = Math.min(1, inp.promptCount / 3);
  health += CONTRIB.prompts * promptRatio;
  if (inp.promptCount >= 3) reasons.push('completed prompts');

  // Verified — binary.
  if (inp.verified) {
    health += CONTRIB.verified;
    reasons.push('verified');
  }

  // Response rate — linear in [0,1].
  const rr = clip01(inp.responseRate);
  health += CONTRIB.responseRate * rr;
  if (rr >= 0.7) reasons.push('replies quickly');
  else if (rr < 0.3) reasons.push('rarely replies');

  // Ghost rate — inverted, linear.
  const gr = clip01(inp.ghostRate);
  health += CONTRIB.ghostRate * (1 - gr);
  if (gr >= 0.5) reasons.push('often ghosts matches');

  // Activity — full contribution below 14 days, decays linearly to 0 by 60.
  const activeContrib =
    inp.daysSinceLastActive <= 14 ? 1
    : inp.daysSinceLastActive >= 60 ? 0
    : 1 - (inp.daysSinceLastActive - 14) / (60 - 14);
  health += CONTRIB.active * activeContrib;
  if (inp.daysSinceLastActive > 30) reasons.push(`inactive ${Math.floor(inp.daysSinceLastActive)}d`);

  health = clip01(health);
  const penalty = (1 - health) * MAX_PENALTY;

  return {
    healthScore: health,
    penalty,
    reasons,
  };
}
