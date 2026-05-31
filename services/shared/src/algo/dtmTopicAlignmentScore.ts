/**
 * dtmTopicAlignmentScore \u2014 DTM Phase 16 composite pair-alignment score (pure).
 *
 * Produces a single 0..1 score combining direction agreement and topic
 * overlap. Intended as a quick "compatibility hint" surface for the
 * For-You ranker.
 *
 *   pearson   = Pearson on signed vectors                      (-1..1)
 *   overlap   = \u03a3 min(shareA, shareB)                            (0..1)
 *   alignment = clamp01( 0.5 * (pearson+1)/2 * 2 + 0.5 * overlap ) wrong
 *
 * Actually: pearsonComponent = (pearson + 1) / 2   \u2208 [0,1]
 *           alignment       = pearsonWeight * pearsonComponent +
 *                              overlapWeight * overlap
 *           weights sum to 1 (renormalised if not).
 */
import { DTM_TOPIC_KEYS } from './dtmTopics';
import { computeDtmTopicCorrelation } from './dtmTopicCorrelation';
import { computeDtmTopicPairAffinity } from './dtmTopicPairAffinity';

export type DtmAlignmentInput = {
  pearsonWeight?: number; // default 0.6
  overlapWeight?: number; // default 0.4
};

export type DtmAlignmentResult = {
  alignment: number;          // 0..1
  pearson: number;            // -1..1
  pearsonComponent: number;   // 0..1
  overlap: number;            // 0..1
  tier: 'low' | 'medium' | 'high';
};

const N = DTM_TOPIC_KEYS.length;

export function computeDtmTopicAlignment(
  a: Float32Array | ReadonlyArray<number>,
  b: Float32Array | ReadonlyArray<number>,
  opts: DtmAlignmentInput = {},
): DtmAlignmentResult {
  if (!a || !b || a.length !== N || b.length !== N) {
    return { alignment: 0, pearson: 0, pearsonComponent: 0.5, overlap: 0, tier: 'low' };
  }

  let pw = opts.pearsonWeight ?? 0.6;
  let ow = opts.overlapWeight ?? 0.4;
  if (pw < 0) pw = 0;
  if (ow < 0) ow = 0;
  const wSum = pw + ow;
  if (wSum === 0) {
    return { alignment: 0, pearson: 0, pearsonComponent: 0.5, overlap: 0, tier: 'low' };
  }
  pw /= wSum;
  ow /= wSum;

  const { correlation } = computeDtmTopicCorrelation(a, b);
  const { overlap } = computeDtmTopicPairAffinity(a, b);
  const pearsonComponent = (correlation + 1) / 2;

  let alignment = pw * pearsonComponent + ow * overlap;
  if (alignment < 0) alignment = 0;
  if (alignment > 1) alignment = 1;

  const tier: 'low' | 'medium' | 'high' =
    alignment >= 0.75 ? 'high' : alignment >= 0.5 ? 'medium' : 'low';

  return { alignment, pearson: correlation, pearsonComponent, overlap, tier };
}
