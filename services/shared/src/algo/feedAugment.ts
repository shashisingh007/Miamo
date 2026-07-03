/**
 * v4 Feed augment — for any feed-style list (notifications inbox, matches
 * panel, recent activity), blend the source ordering with personal fit.
 */
import { compose, clip100, expDecay, clip01 } from './math';
import { registerAlgo } from './registry';
import { v5FeatureEnabled } from './flags';

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

export function rerankFeedV4(inp: FeedInputs): number {
  const breakdown = {
    source: clip01(inp.sourceScore),
    forYou: inp.forYouScore / 100,
    recency: expDecay(inp.itemAgeSec, 6 * 3600),
  };
  return clip100(compose(breakdown, WEIGHTS) * 100);
}

/** v5 — adds a `filterAffinity` lane so items that match Priya's recently
 *  applied filters bubble up. `filterAffinity` ∈ [0, 1] — caller computes
 *  jaccard between item-tags and the user's `filter.apply` rolling set. */
const WEIGHTS_V5 = {
  source: 0.40,
  forYou: 0.30,
  recency: 0.15,
  filterAffinity: 0.15,
} as const;

export type FeedInputsV5 = FeedInputs & { filterAffinity?: number };

export function rerankFeedV5(inp: FeedInputsV5): number {
  const breakdown = {
    source: clip01(inp.sourceScore),
    forYou: inp.forYouScore / 100,
    recency: expDecay(inp.itemAgeSec, 6 * 3600),
    filterAffinity: clip01(inp.filterAffinity ?? 0),
  };
  return clip100(compose(breakdown, WEIGHTS_V5) * 100);
}

export function rerankFeed(inp: FeedInputsV5): number {
  return v5FeatureEnabled('feedAugment') ? rerankFeedV5(inp) : rerankFeedV4(inp);
}

registerAlgo({
  name: 'feedAugment',
  surface: 'feed',
  usesEvents: ['scroll.depth', 'click', 'profile.view',
    'filter.open', 'filter.change', 'filter.apply', 'filter.reset'],
  weights: WEIGHTS,
});
