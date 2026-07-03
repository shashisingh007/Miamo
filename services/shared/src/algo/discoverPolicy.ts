/**
 * discoverPolicy — Phase 5 session-shaping policy.
 *
 * Inspects a user's last N session summaries and returns guard-rail tweaks
 * the Discover surface should apply. Three patterns we detect:
 *
 *   1. windowShopping  — last 3 sessions all `windowShopping=true`.
 *      Response: slow exploration, surface fewer-but-stronger matches,
 *      damp the v6 score (already handled in `scoreForYouV6`).
 *
 *   2. zeroActionRecovery — last 2 sessions both `zeroActionSession=true`.
 *      Response: inject a few low-friction prompts ("see who liked you"
 *      style); soft-boost reciprocity over raw compatibility.
 *
 *   3. ghostedSelf      — last session `ghostedSelf=true`.
 *      Response: surface 1 "easy reply" prompt; do NOT increase notif rate.
 *
 * Pure function: returns a `DiscoverPolicy` for the caller to apply.
 * No DB writes here; the caller (gateway / users service) is responsible
 * for plumbing the tweaks through.
 */
import type { SessionSummaryRow } from './signals';

export type DiscoverPolicy = {
  /** Multiplier on candidate set size (1.0 = default). 0.6 = "fewer, better". */
  candPoolMultiplier: number;
  /** Multiplier on reciprocity term inside v6 ranker (>1 = boost). */
  reciprocityBoost: number;
  /** Suggest the UI inject an "easy reply" or "see who liked you" prompt. */
  injectGentleNudge: 'easy_reply' | 'who_liked_you' | null;
  /** Diagnostics so we can audit policy choices in tracing. */
  detected: {
    windowShopping: boolean;
    zeroActionRecovery: boolean;
    ghostedSelf: boolean;
  };
};

export const DEFAULT_POLICY: DiscoverPolicy = {
  candPoolMultiplier: 1.0,
  reciprocityBoost: 1.0,
  injectGentleNudge: null,
  detected: { windowShopping: false, zeroActionRecovery: false, ghostedSelf: false },
};

export function computeDiscoverPolicy(sessions: SessionSummaryRow[]): DiscoverPolicy {
  if (!sessions || sessions.length === 0) return DEFAULT_POLICY;

  // Sessions arrive most-recent-first by convention; preserve that ordering.
  const last3 = sessions.slice(0, 3);
  const last2 = sessions.slice(0, 2);
  const last1 = sessions[0];

  const windowShopping = last3.length === 3 && last3.every((s) => s.windowShopping);
  const zeroActionRecovery = last2.length === 2 && last2.every((s) => s.zeroActionSession);
  const ghostedSelf = !!last1?.ghostedSelf;

  let candPoolMultiplier = 1.0;
  let reciprocityBoost = 1.0;
  let injectGentleNudge: DiscoverPolicy['injectGentleNudge'] = null;

  if (windowShopping) {
    candPoolMultiplier *= 0.6;        // smaller pool of stronger matches
  }
  if (zeroActionRecovery) {
    reciprocityBoost = 1.25;          // 25% boost on reciprocal intent term
    injectGentleNudge = 'who_liked_you';
  }
  if (ghostedSelf) {
    injectGentleNudge = injectGentleNudge ?? 'easy_reply';
  }

  return {
    candPoolMultiplier,
    reciprocityBoost,
    injectGentleNudge,
    detected: { windowShopping, zeroActionRecovery, ghostedSelf },
  };
}
