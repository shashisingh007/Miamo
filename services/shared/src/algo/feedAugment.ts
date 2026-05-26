/**
 * v4 Feed augment — for any feed-style list (notifications inbox, matches
 * panel, recent activity), blend the source ordering with personal fit.
 */
import { compose, clip100, expDecay } from './math';
import { registerAlgo } from './registry';

const WEIGHTS = {
  source: 0.50,
  forYou: 0.30,
  recency: 0.20,
} as const;

export type FeedInputs = {
  sourceScore: number;  // 0..1, upstream ordering rank inverted
  forYouScore: number;  // 0..100
  itemAgeSec: number;
};

export function rerankFeed(inp: FeedInputs): number {
  const breakdown = {
    source: Math.max(0, Math.min(1, inp.sourceScore)),
    forYou: inp.forYouScore / 100,
    recency: expDecay(inp.itemAgeSec, 6 * 3600),
  };
  return clip100(compose(breakdown, WEIGHTS) * 100);
}

registerAlgo({
  name: 'feedAugment',
  surface: 'feed',
  usesEvents: ['scroll.depth', 'click', 'profile.view'],
  weights: WEIGHTS,
});
