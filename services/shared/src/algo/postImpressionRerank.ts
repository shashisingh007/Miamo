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

export function postImpressionPenalty(skippedCount: number, secsSinceLast: number, base = 12): number {
  if (skippedCount <= 0) return 0;
  return base * logScale(skippedCount, 50) * (0.3 + 0.7 * expDecay(secsSinceLast, 86400));
}

registerAlgo({
  name: 'postImpressionRerank',
  surface: 'discover',
  usesEvents: ['discover.card_view', 'discover.swipe', 'scroll.depth'],
  weights: { penalty: 1 },
});
