/**
 * DTM feed builder v7 — picks the next batch of DTM topics to ask.
 *
 * Pure module. Inputs:
 *   - `weights`: the user's DTM weight profile (per-topic affinity)
 *   - `candidates`: pool of topic candidates with metadata (last asked, etc.)
 *   - `history`: recent answer / skip / abandon counts per topic
 *   - `archetypeCohort`: optional per-topic popularity in the user's cohort
 *
 * Output: ordered batch of K topics + per-topic reason chips for the UI.
 *
 * Recipe (sums to 1.0):
 *   0.30 topicCoverageGap     — bias toward least-answered topics
 *   0.20 weightAffinity       — topics the profile already weights highest
 *   0.15 freshness            — haven't asked in N days
 *   0.15 reciprocityHook      — historically produced mutual-quality lift
 *   0.10 emotionalArc         — vary tone within a batch
 *   0.10 cohortSignal         — what the user's archetype peers respond to
 *
 * Penalties:
 *   -0.40 recently abandoned (`dtm.partial_abandon` last 7d)
 *   -0.25 recently skipped   (`dtm.question_skip` last 3d)
 *   -0.50 already-saturated  (answered ≥ 5 questions in this topic)
 */

export type DtmTopicId = string;

export type DtmTopicCandidate = {
  topic: DtmTopicId;
  /** Importance weight of this topic in the canonical 16-topic ordering. 0..1 */
  importance: number;
  /** Days since this topic was last asked. null = never. */
  lastAskedDaysAgo: number | null;
  /** Tone bucket for emotional arc balancing. */
  tone: 'warm' | 'playful' | 'reflective' | 'light';
  /** Archetype-cohort popularity in 0..1 (peers respond well). */
  cohortPopularity?: number;
  /** Historical mutual-quality-chat lift produced by this topic. */
  reciprocityLift?: number;
};

export type DtmTopicHistory = {
  /** Number of times user answered this topic in the lookback window. */
  answered: number;
  skippedRecently: boolean;
  abandonedRecently: boolean;
};

export type DtmFeedInput = {
  weights: Map<DtmTopicId, number>;
  candidates: DtmTopicCandidate[];
  history: Map<DtmTopicId, DtmTopicHistory>;
  k?: number;
  /** Soft cap on how many of one tone may appear in a batch. Default 3. */
  toneCap?: number;
  /**
   * v8 — optional viewer-state allowlist computed by `dtmTopicMask.ts`. When
   * provided, any candidate not in the list is rejected with `reason: 'mood_mask'`
   * BEFORE scoring. `null`/`undefined` keeps v7 behaviour byte-identical. The
   * mask is a SOFT skip: blocked topics re-surface at the next batch whose
   * viewer state clears the gate (caller re-computes the mask each call).
   */
  topicMask?: readonly DtmTopicId[] | null;
};

export type DtmTopicReason = 'coverage' | 'affinity' | 'fresh' | 'reciprocity' | 'cohort' | 'arc';

export type DtmFeedItem = {
  topic: DtmTopicId;
  score: number;
  reasons: DtmTopicReason[];
};

export type DtmFeedResult = {
  batch: DtmFeedItem[];
  /** Topics rejected by penalty/cap, with reason. Useful for telemetry. */
  rejected: Array<{ topic: DtmTopicId; reason: string }>;
};

const W_COVERAGE     = 0.30;
const W_AFFINITY     = 0.20;
const W_FRESH        = 0.15;
const W_RECIPROCITY  = 0.15;
const W_ARC          = 0.10;
const W_COHORT       = 0.10;

const PENALTY_ABANDONED = 0.40;
const PENALTY_SKIPPED   = 0.25;
const SATURATION_LIMIT  = 5;

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function freshnessScore(lastAskedDaysAgo: number | null, now = Date.now()): number {
  void now;
  if (lastAskedDaysAgo === null) return 1;
  if (lastAskedDaysAgo < 1) return 0;
  // Saturating curve: 7d → 0.7, 14d → ~0.86, 30d → ~0.94, ∞ → 1
  return clamp01(1 - Math.exp(-lastAskedDaysAgo / 14));
}

export function buildDtmFeed(input: DtmFeedInput): DtmFeedResult {
  const k = Math.max(1, Math.min(20, input.k ?? 10));
  const toneCap = Math.max(1, input.toneCap ?? 3);

  // v8 — viewer-state mask. Build a Set for O(1) membership; null/undefined ⇒
  // no mask (legacy v7 behaviour). An empty array means "everything blocked";
  // we let buildDtmFeed return an empty batch in that case — the caller (the
  // batch route) is responsible for the no-starve fallback per spec §D.4.
  const maskSet: Set<DtmTopicId> | null = input.topicMask
    ? new Set<DtmTopicId>(input.topicMask)
    : null;

  const rejected: Array<{ topic: DtmTopicId; reason: string }> = [];
  const scored: DtmFeedItem[] = [];

  for (const cand of input.candidates) {
    if (maskSet && !maskSet.has(cand.topic)) {
      rejected.push({ topic: cand.topic, reason: 'mood_mask' });
      continue;
    }
    const hist = input.history.get(cand.topic) ?? {
      answered: 0,
      skippedRecently: false,
      abandonedRecently: false,
    };
    if (hist.answered >= SATURATION_LIMIT) {
      rejected.push({ topic: cand.topic, reason: 'saturated' });
      continue;
    }

    const reasons: DtmTopicReason[] = [];

    const coverage = clamp01(1 - hist.answered / SATURATION_LIMIT) * cand.importance;
    if (coverage > 0.5) reasons.push('coverage');

    const affinity = clamp01(input.weights.get(cand.topic) ?? 0);
    if (affinity > 0.6) reasons.push('affinity');

    const fresh = freshnessScore(cand.lastAskedDaysAgo);
    if (fresh > 0.7) reasons.push('fresh');

    const reciprocity = clamp01(cand.reciprocityLift ?? 0);
    if (reciprocity > 0.5) reasons.push('reciprocity');

    const cohort = clamp01(cand.cohortPopularity ?? 0);
    if (cohort > 0.5) reasons.push('cohort');

    let score =
      W_COVERAGE * coverage +
      W_AFFINITY * affinity +
      W_FRESH * fresh +
      W_RECIPROCITY * reciprocity +
      W_COHORT * cohort;

    if (hist.abandonedRecently) score -= PENALTY_ABANDONED;
    if (hist.skippedRecently) score -= PENALTY_SKIPPED;

    if (score <= 0) {
      rejected.push({ topic: cand.topic, reason: 'low_score' });
      continue;
    }

    scored.push({ topic: cand.topic, score, reasons });
  }

  // Stable sort by score desc, tie-broken by topic id for determinism.
  scored.sort((a, b) => (b.score - a.score) || (a.topic < b.topic ? -1 : 1));

  // Emotional-arc rebalancing: enforce per-tone cap as we accumulate.
  const toneCounts = new Map<string, number>();
  const batch: DtmFeedItem[] = [];
  const candByTopic = new Map(input.candidates.map((c) => [c.topic, c]));

  for (const item of scored) {
    if (batch.length >= k) break;
    const tone = candByTopic.get(item.topic)?.tone ?? 'reflective';
    const cur = toneCounts.get(tone) ?? 0;
    if (cur >= toneCap) {
      // Apply a small arc bonus penalty by deferring to later in the batch.
      // Push to a holding list — handled implicitly by skipping now.
      continue;
    }
    toneCounts.set(tone, cur + 1);
    if (item.reasons.length === 0) item.reasons.push('arc');
    // Add a small arc bonus to the score for analytics (does not affect order).
    item.score = Math.min(1, item.score + W_ARC * (1 - cur / toneCap));
    batch.push(item);
  }

  // If we couldn't fill k under the tone cap, relax the cap and fill from
  // the leftovers in original-score order.
  if (batch.length < k) {
    const placed = new Set(batch.map((b) => b.topic));
    for (const item of scored) {
      if (batch.length >= k) break;
      if (placed.has(item.topic)) continue;
      batch.push(item);
    }
  }

  return { batch, rejected };
}
