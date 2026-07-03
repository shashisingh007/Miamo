/**
 * v8 DTM batch glue — composes the viewer-state mask into the v7 ranker.
 *
 * Pure module, no I/O. The caller (`services/content/src/server.ts`) reads
 * `FeatureSnapshot.raw.moodRightNow`, the last 2 `SessionSummary` rows, and
 * the user's DTM coverage vector, then hands them here. We return:
 *
 *   - the v7 `buildDtmFeed` result (already mask-aware as of v8),
 *   - the `TopicMaskResult` that produced it (for telemetry — the caller emits
 *     `dtm.topic_masked` on each batch item whose topic was in
 *     `mask.blockedTopics`),
 *   - the `effectiveMask` actually passed to `buildDtmFeed` (post-fallback —
 *     differs from `mask.allowedTopics` only when the no-starve guard kicks).
 *
 * Spec: prompt §3–§4 (DTM topic-mask wiring). Flag-gated by the caller via
 * `FEATURE_DTM_MASK_ENABLED` — when the flag is off, the caller passes
 * `topicMask: null` to `buildDtmFeed` directly and never touches this module.
 *
 * No-starve guard (prompt §4):
 *   When `computeTopicMask` returns `allowedTopics.length === 0` — e.g.
 *   coverage 'empty' degenerate case combined with weird inputs — we fall
 *   back to the two lightest topics (`values`, `lifestyle`) so the user is
 *   never served zero questions.
 */
import { buildDtmFeed, type DtmFeedInput, type DtmFeedResult, type DtmTopicId } from '../dtmFeedV7';
import {
  computeTopicMask,
  type DtmMaskInput,
  type TopicMaskResult,
  type TopicKey,
} from './dtmTopicMask';

export const NO_STARVE_FALLBACK: readonly TopicKey[] = ['values', 'lifestyle'];
// because: the two anchor topics from `dtmTopicMask.EMPTY_STAGE_ALLOWED`. If
// every other rule produces an empty allowlist (only possible via a future
// rule, since the current set is non-empty by construction), we land back at
// the cold-start anchors — the lowest-cognitive-load openers per §D.7.1.

export interface BuildMaskedFeedInput {
  /** v7 input — the same object the caller would pass without v8. */
  feed: Omit<DtmFeedInput, 'topicMask'>;
  /** v8 mask input — gathered by the caller from FeatureSnapshot / SessionSummary / cold-start. */
  mask: DtmMaskInput;
}

export interface BuildMaskedFeedOutput {
  result: DtmFeedResult;
  mask: TopicMaskResult;
  /** Allowlist actually passed to `buildDtmFeed` (after no-starve fallback). */
  effectiveMask: readonly TopicKey[];
}

/**
 * Compute the mask, apply the no-starve guard, and run the v7 ranker with the
 * resulting allowlist. Returns everything the route needs for both the
 * response and the telemetry write.
 */
export function buildMaskedDtmFeed(input: BuildMaskedFeedInput): BuildMaskedFeedOutput {
  const mask = computeTopicMask(input.mask);
  const effective: readonly TopicKey[] =
    mask.allowedTopics.length === 0 ? NO_STARVE_FALLBACK : mask.allowedTopics;

  const result = buildDtmFeed({
    ...input.feed,
    topicMask: effective as readonly DtmTopicId[],
  });

  return { result, mask, effectiveMask: effective };
}

/**
 * Identify topics surfaced this batch that originated from the blocked set —
 * impossible under the standard mask semantics (blocked topics are filtered
 * BEFORE ranking) but kept as a defensive accessor in case a future caller
 * passes a hand-built mask. Used by the route to decide which items deserve
 * a `dtm.topic_masked` audit event.
 *
 * Per prompt §3 the event fires when `result.reason !== 'no_mask'` AND the
 * chosen topic was originally in `result.blockedTopics`. We return the
 * intersection so the caller can iterate and emit.
 */
export function findBatchTopicsInBlocked(
  result: DtmFeedResult,
  mask: TopicMaskResult,
): DtmTopicId[] {
  if (mask.reason === 'no_mask' || mask.blockedTopics.length === 0) return [];
  const blocked = new Set<string>(mask.blockedTopics);
  return result.batch.filter((b) => blocked.has(b.topic)).map((b) => b.topic);
}

/**
 * Returns the per-batch topics that were rejected by the mask (i.e. would
 * have ranked but the viewer-state gate suppressed them). The route uses this
 * to count `dtm.topic_masked` emissions — one per rejected topic, per spec.
 */
export function maskRejectedTopics(result: DtmFeedResult): DtmTopicId[] {
  return result.rejected.filter((r) => r.reason === 'mood_mask').map((r) => r.topic);
}
