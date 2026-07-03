/**
 * v4 Post-impression re-rank — bandit-style penalty for cards that were
 * shown but neither viewed nor swiped. The same candidate keeps falling
 * down a user's stack the more it is ignored.
 *
 * penalty = base * log1p(skippedCount) * exp(-secsSinceLast / 86400)
 *
 * Returns a *delta* to subtract from the upstream score. Caller is
 * responsible for clipping after subtraction.
 */
import { logScale, expDecay } from './math';
import { registerAlgo } from './registry';
import { v5FeatureEnabled } from './flags';

export function postImpressionPenalty(skippedCount: number, secsSinceLast: number, base = 12): number {
  if (skippedCount <= 0) return 0;
  return base * logScale(skippedCount, 50) * (0.3 + 0.7 * expDecay(secsSinceLast, 86400));
}

/**
 * v5 — adds positive signals (dwell, bio expand, intent.profile.settle) so
 * cards Priya actively examined surface back up in the *next* batch, and
 * adds a hard negative for swipe.repeat_pass. Returns a signed delta:
 * positive means "rank up", negative means "rank down". The v4 penalty
 * function is incorporated as the negative-skip baseline.
 *
 * Per master prompt §3.1: postImpressionRerank reranks the NEXT batch,
 * never the current one Priya is viewing. The caller is expected to
 * accumulate per-target signals during the current batch and apply the
 * delta to the next.
 */
export type RerankSignals = {
  skippedCount: number;
  secsSinceLast: number;
  /** Median dwell ms on this target's card.impression.100 over the session. */
  dwellMsMedian?: number;
  /** Did Priya expand this candidate's bio? */
  bioExpanded?: boolean;
  /** Count of intent.profile.settle on this target this session. */
  settleCount?: number;
  /** Count of swipe.repeat_pass on this target. */
  repeatPassCount?: number;
};

export function postImpressionDeltaV5(s: RerankSignals): number {
  // Base negative — the old behaviour, kept identical.
  let delta = -postImpressionPenalty(s.skippedCount, s.secsSinceLast);
  // Positive signals.
  if (s.dwellMsMedian && s.dwellMsMedian >= 2_000) {
    delta += 4; // 2s+ dwell is meaningful attention
  }
  if (s.dwellMsMedian && s.dwellMsMedian >= 5_000) {
    delta += 4; // additional boost for long dwell
  }
  if (s.bioExpanded) delta += 5;
  if (s.settleCount && s.settleCount > 0) delta += Math.min(8, s.settleCount * 4);
  // Hard negative — repeat_pass is the strongest "no" signal.
  if (s.repeatPassCount && s.repeatPassCount > 0) delta -= 15;
  return delta;
}

/** Dispatcher. v4 callers use `postImpressionPenalty` directly. */
export function postImpressionDelta(s: RerankSignals): number {
  if (v5FeatureEnabled('postImpressionRerank')) return postImpressionDeltaV5(s);
  return -postImpressionPenalty(s.skippedCount, s.secsSinceLast);
}

registerAlgo({
  name: 'postImpressionRerank',
  surface: 'discover',
  usesEvents: ['discover.card_view', 'discover.swipe', 'scroll.depth',
    'card.impression.100', 'card.bio.expand', 'intent.profile.settle', 'swipe.repeat_pass'],
  weights: { penalty: 1 },
});
