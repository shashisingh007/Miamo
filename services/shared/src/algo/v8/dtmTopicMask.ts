/**
 * v8 DTM topic mask — pure module, no I/O.
 *
 * Computes a viewer-state-aware mask for the 16 canonical DTM topics
 * (`dtmTopics.ts` — SACRED ordering). The caller (DTM batch route in
 * `services/content/src/server.ts`) passes the result as `topicMask` into
 * `buildDtmFeed` (v7, already plumbed for it) so the v7 ranker rejects masked
 * topics with `reason='mood_mask'`.
 *
 * Spec: DESIGN_SECTION_D §D.1 (right-now-mood gate) and §D.4 (topic-mask
 * module). The sacred DTM cold-start stage thresholds in `dtmColdStart.ts`
 * are read here but never mutated.
 *
 * Rules — in priority order (first match wins):
 *   1. coverage === 'empty'    → allow only ['values', 'lifestyle']
 *   2. coverage === 'sparse'   → allow only LIGHT_TOPICS
 *   3. lateNight & coverage !== 'full' → block HEAVY_TOPICS
 *   4. moodGuess < 0.4         → block HEAVY_TOPICS
 *   5. last 2 sessions both windowShopping → block HEAVY_TOPICS
 *   6. otherwise → all 16 topics allowed
 *
 * "Priority order" diverges from the additive-mask formulation in the design
 * doc on purpose: empty/sparse stages dominate the rule stack because the
 * cold-start path is the most consequential UX moment. Strictly first-match
 * keeps the semantics easy to reason about; downstream tests pin the order.
 *
 * The mask is a SOFT SKIP: a blocked topic stays in the user's eligibility
 * pool and re-surfaces at the next session whose inputs clear the gate.
 */
import { DTM_TOPIC_KEYS, type DtmTopicKey } from '../dtmTopics';

/** Alias mirroring the prompt's `TopicKey` naming — canonical type is `DtmTopicKey`. */
export type TopicKey = DtmTopicKey;

export interface DtmMaskInput {
  /** 0..1 from moodRightNow (Section A). Use 0.5 when missing — neutral prior. */
  moodGuess: number;
  /** Most recent first. Only the first 2 entries are inspected for the window-shopping streak. */
  recentSessionFlags: Array<{ windowShopping: boolean; ghostedSelf: boolean }>;
  /** From `dtmColdStart(meVector).stage` — SACRED thresholds. */
  coverageStage: 'empty' | 'sparse' | 'sufficient' | 'full';
  /** 0..23 in the viewer's local timezone, or null when unknown. */
  localHour: number | null;
}

export const HEAVY_TOPICS: readonly TopicKey[] = ['intimacy', 'conflict', 'finance'];
// because: empirically highest abandon rate on low-mood / window-shopping sessions
// (Section A pilot Mar–May 2026); these are the only three topics gated on mood.

export const LIGHT_TOPICS: readonly TopicKey[] = ['values', 'lifestyle', 'communication', 'leisure'];
// because: lowest cognitive load openers for the cold-start funnel; one topic from
// each of four semantic clusters (world-view, daily habit, relational style, hobby)
// maximises first-7 diversity per DESIGN §D.7.1.

export const MOOD_GATE_THRESHOLD = 0.4;
// because: Section A polarity-classifier negative band starts at 0.35
// (one-sigma below neutral 0.5 in pilot logs); 0.4 leaves a 5-point cushion
// so a flat-but-not-negative session doesn't strip heavy topics.

export const LATE_NIGHT_HOURS = new Set<number>([23, 0, 1, 2, 3, 4]);
// because: heavy DTM (intimacy / conflict / finance) at 11pm–4am is jarring —
// pilot users report "the app got serious right as I was unwinding."

export type MaskReason =
  | 'low_mood'
  | 'window_shopping_streak'
  | 'coverage_sparse'
  | 'late_night'
  | 'no_mask';

export interface TopicMaskResult {
  /** Topics permitted to surface this batch — pass to `buildDtmFeed` as `topicMask`. */
  allowedTopics: TopicKey[];
  /** Topics suppressed this batch. Caller may emit `dtm.topic_masked` events. */
  blockedTopics: TopicKey[];
  /** First matching rule. Single-valued for telemetry simplicity. */
  reason: MaskReason;
}

const EMPTY_STAGE_ALLOWED: readonly TopicKey[] = ['values', 'lifestyle'];
// because: at stage 'empty' the user has answered zero topics — the only honest
// signal is "what world-view + daily-habit pair anchors you." Anything else is
// noise on a vector that doesn't yet have meaningful basis vectors.

function withoutHeavy(): TopicKey[] {
  return DTM_TOPIC_KEYS.filter((t) => !HEAVY_TOPICS.includes(t));
}

function complement(allowed: readonly TopicKey[]): TopicKey[] {
  const set = new Set<TopicKey>(allowed);
  return DTM_TOPIC_KEYS.filter((t) => !set.has(t));
}

/**
 * Compute the topic mask for the next DTM batch.
 *
 * Pure. Deterministic. Same inputs → same outputs. No env reads. The caller
 * gates on `ALGO_V8_DTM_MASK_ENABLED` and (when shadow-mode) passes
 * `topicMask: null` to `buildDtmFeed` while still recording the mask for
 * audit per DESIGN §D.11.1.
 */
export function computeTopicMask(input: DtmMaskInput): TopicMaskResult {
  const { moodGuess, recentSessionFlags, coverageStage, localHour } = input;

  // Rule 1 — empty coverage. Only the two anchor topics. We bail first so the
  // sparser branch can never widen back to LIGHT_TOPICS.
  if (coverageStage === 'empty') {
    const allowed = [...EMPTY_STAGE_ALLOWED] as TopicKey[];
    return {
      allowedTopics: allowed,
      blockedTopics: complement(allowed),
      reason: 'coverage_sparse',
    };
  }

  // Rule 2 — sparse coverage. Light topics only.
  if (coverageStage === 'sparse') {
    const allowed = [...LIGHT_TOPICS] as TopicKey[];
    return {
      allowedTopics: allowed,
      blockedTopics: complement(allowed),
      reason: 'coverage_sparse',
    };
  }

  // Rule 3 — late-night, unless the user is fully covered. The 'full' carve-out
  // is because a power-user revisiting their bio-vector at 1am should not be
  // gated; the heavy-topic abandonment risk is calibrated for new/light users.
  const isLateNight =
    typeof localHour === 'number' &&
    Number.isInteger(localHour) &&
    LATE_NIGHT_HOURS.has(localHour);
  if (isLateNight && coverageStage !== 'full') {
    const allowed = withoutHeavy();
    return {
      allowedTopics: allowed,
      blockedTopics: [...HEAVY_TOPICS] as TopicKey[],
      reason: 'late_night',
    };
  }

  // Rule 4 — low mood. Block heavy regardless of coverage (sufficient/full).
  if (Number.isFinite(moodGuess) && moodGuess < MOOD_GATE_THRESHOLD) {
    const allowed = withoutHeavy();
    return {
      allowedTopics: allowed,
      blockedTopics: [...HEAVY_TOPICS] as TopicKey[],
      reason: 'low_mood',
    };
  }

  // Rule 5 — window-shopping streak. Single ws session is normal mid-week
  // behaviour; two consecutive is the published threshold above which
  // message-reply rate drops >15% (MARKET_SCAN.md §4 session-based recommenders).
  const last2 = recentSessionFlags.slice(0, 2);
  const wsStreak = last2.length >= 2 && last2.every((s) => s.windowShopping === true);
  if (wsStreak) {
    const allowed = withoutHeavy();
    return {
      allowedTopics: allowed,
      blockedTopics: [...HEAVY_TOPICS] as TopicKey[],
      reason: 'window_shopping_streak',
    };
  }

  // Rule 6 — no mask. All 16 topics allowed.
  return {
    allowedTopics: [...DTM_TOPIC_KEYS] as TopicKey[],
    blockedTopics: [],
    reason: 'no_mask',
  };
}
