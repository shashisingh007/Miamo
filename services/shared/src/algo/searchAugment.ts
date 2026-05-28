/**
 * v4 Search augment — re-rank text search candidates by personal fit.
 *
 * Standard text search returns N candidates ordered by lexical score
 * (`textScore` 0..1). This helper blends with the v4 forYou score so users
 * with similar query strings get personalised ordering. No external search
 * engine — pure scoring.
 */
import { compose, clip100, clip01 } from './math';
import { scoreForYou, type ForYouInputs } from './forYou';
import { registerAlgo } from './registry';
import { v5FeatureEnabled } from './flags';

const WEIGHTS = {
  text: 0.55,
  forYou: 0.35,
  freshness: 0.10,
} as const;

export type SearchInputs = ForYouInputs & {
  textScore: number; // 0..1 from upstream search
  candUpdatedAtMs: number;
};

export function rerankSearchV4(inp: SearchInputs): { score: number; explain: Record<string, unknown> } {
  const days = Math.max(0, (Date.now() - inp.candUpdatedAtMs) / 86400_000);
  const freshness = days > 30 ? 0.3 : 1 - days / 60;
  const fy = scoreForYou(inp);
  const breakdown = {
    text: Math.max(0, Math.min(1, inp.textScore)),
    forYou: fy.score / 100,
    freshness,
  };
  const score = clip100(compose(breakdown, WEIGHTS) * 100);
  return { score, explain: { algo: 'searchAugment', algoVersion: 'v4', consentScope: inp.consent, breakdown, weights: WEIGHTS, finalScore: score } };
}

/** v5 — incorporates per-user search frustration / engagement signals from
 *  the EventAggDaily rollups so a Priya who repeatedly hits "no results"
 *  for a similar query gets her result-set re-shaped (penalise stale-style
 *  candidates) and a Priya whose recent search.result_clicks landed on
 *  active profiles gets a freshness boost. */
const WEIGHTS_V5 = {
  text: 0.45,
  forYou: 0.35,
  freshness: 0.10,
  searchHealth: 0.10,
} as const;

export type SearchInputsV5 = SearchInputs & {
  /** Count of `search.no_results` events for this user in the last 7d. */
  noResultsCount7d?: number;
  /** Count of `search.result_click` events in the last 7d. */
  resultClickCount7d?: number;
};

export function rerankSearchV5(inp: SearchInputsV5): { score: number; explain: Record<string, unknown> } {
  const days = Math.max(0, (Date.now() - inp.candUpdatedAtMs) / 86400_000);
  const freshness = days > 30 ? 0.3 : 1 - days / 60;
  const fy = scoreForYou(inp);
  const clicks = inp.resultClickCount7d ?? 0;
  const noRes = inp.noResultsCount7d ?? 0;
  // searchHealth in [0, 1]. Many clicks → 1. Many no-results → ~0.3.
  const searchHealth = clip01((clicks + 1) / (clicks + noRes + 2));
  const breakdown = {
    text: clip01(inp.textScore),
    forYou: fy.score / 100,
    freshness,
    searchHealth,
  };
  const score = clip100(compose(breakdown, WEIGHTS_V5) * 100);
  return { score, explain: { algo: 'searchAugment', algoVersion: 'v5', consentScope: inp.consent, breakdown, weights: WEIGHTS_V5, finalScore: score } };
}

export function rerankSearch(inp: SearchInputsV5): { score: number; explain: Record<string, unknown> } {
  return v5FeatureEnabled('searchAugment') ? rerankSearchV5(inp) : rerankSearchV4(inp);
}

registerAlgo({
  name: 'searchAugment',
  surface: 'search',
  usesEvents: ['profile.view', 'discover.card_view', 'click',
    'filter.open', 'filter.change', 'filter.apply', 'filter.reset',
    'search.query', 'search.result_click', 'search.no_results'],
  weights: WEIGHTS,
});
