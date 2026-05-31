/**
 * coldStart — Phase 5 first-session / sparse-signal policy.
 *
 * Complements `computeDiscoverPolicy`: when a user has no usable history
 * (brand-new account, or recently re-activated after long absence), we
 * cannot personalise yet. The right move is the opposite of the
 * windowShopping clamp: *widen* the pool and *de-weight* the personalised
 * v6 score in favour of static signals (interestsOverlap, distance).
 *
 * Pure function. Caller decides how to apply the returned shape.
 *
 * Detection ladder:
 *   - "fresh"      — 0 sessions ever            → strongest defaults
 *   - "warming"    — 1–2 sessions, < threshold  → mild widening
 *   - "established" — ≥3 sessions               → no cold-start applied
 *
 * Re-activation ladder (independent):
 *   - "dormant"    — last session > dormantDays old → treat as warming
 */
import type { SessionSummaryRow } from './signals';

export type ColdStartStage = 'fresh' | 'warming' | 'established';

export type ColdStartPolicy = {
  stage: ColdStartStage;
  /** Multiplier on candidate pool size (>1 widens). */
  candPoolMultiplier: number;
  /** Weight given to the personalised v6 score in final compose (0..1). */
  personalisedWeight: number;
  /** Weight given to static fallback (interests/distance/age). */
  fallbackWeight: number;
  /** Whether the UI should ask one onboarding question this session. */
  suggestOnboardingPrompt: boolean;
  detected: {
    sessionCount: number;
    dormant: boolean;
  };
};

export type ColdStartOpts = {
  /** Below this session count we treat as "warming". Default 3. */
  warmingThreshold?: number;
  /** Days since last session that mark a returning user as dormant. Default 21. */
  dormantDays?: number;
  /** Reference clock for dormancy check. Default Date.now. */
  nowMs?: number;
};

export function coldStartPolicy(
  sessions: SessionSummaryRow[],
  opts: ColdStartOpts = {},
): ColdStartPolicy {
  const warmingThreshold = opts.warmingThreshold ?? 3;
  const dormantDays = opts.dormantDays ?? 21;
  const nowMs = opts.nowMs ?? Date.now();

  const count = sessions?.length ?? 0;
  let dormant = false;
  if (count > 0) {
    const last = sessions[0] as { endedAt?: Date | number; startedAt?: Date | number };
    const raw = last.endedAt ?? last.startedAt;
    const lastTs = raw instanceof Date ? raw.getTime() : (typeof raw === 'number' ? raw : 0);
    if (lastTs > 0) {
      const ageMs = nowMs - lastTs;
      dormant = ageMs > dormantDays * 86_400_000;
    }
  }

  let stage: ColdStartStage;
  if (count === 0) stage = 'fresh';
  else if (count < warmingThreshold || dormant) stage = 'warming';
  else stage = 'established';

  if (stage === 'established') {
    return {
      stage,
      candPoolMultiplier: 1.0,
      personalisedWeight: 1.0,
      fallbackWeight: 0.0,
      suggestOnboardingPrompt: false,
      detected: { sessionCount: count, dormant },
    };
  }

  if (stage === 'fresh') {
    return {
      stage,
      candPoolMultiplier: 1.8,
      personalisedWeight: 0.2,
      fallbackWeight: 0.8,
      suggestOnboardingPrompt: true,
      detected: { sessionCount: count, dormant },
    };
  }

  // warming
  return {
    stage,
    candPoolMultiplier: 1.3,
    personalisedWeight: 0.6,
    fallbackWeight: 0.4,
    suggestOnboardingPrompt: false,
    detected: { sessionCount: count, dormant },
  };
}
