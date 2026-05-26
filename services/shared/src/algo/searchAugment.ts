/**
 * v4 Search augment — re-rank text search candidates by personal fit.
 *
 * Standard text search returns N candidates ordered by lexical score
 * (`textScore` 0..1). This helper blends with the v4 forYou score so users
 * with similar query strings get personalised ordering. No external search
 * engine — pure scoring.
 */
import { compose, clip100 } from './math';
import { scoreForYou, type ForYouInputs } from './forYou';
import { registerAlgo } from './registry';

const WEIGHTS = {
  text: 0.55,
  forYou: 0.35,
  freshness: 0.10,
} as const;

export type SearchInputs = ForYouInputs & {
  textScore: number; // 0..1 from upstream search
  candUpdatedAtMs: number;
};

export function rerankSearch(inp: SearchInputs): { score: number; explain: Record<string, unknown> } {
  const days = Math.max(0, (Date.now() - inp.candUpdatedAtMs) / 86400_000);
  const freshness = days > 30 ? 0.3 : 1 - days / 60;
  const fy = scoreForYou(inp);
  const breakdown = {
    text: Math.max(0, Math.min(1, inp.textScore)),
    forYou: fy.score / 100,
    freshness,
  };
  const score = clip100(compose(breakdown, WEIGHTS) * 100);
  return { score, explain: { algo: 'searchAugment', consentScope: inp.consent, breakdown, weights: WEIGHTS, finalScore: score } };
}

registerAlgo({
  name: 'searchAugment',
  surface: 'search',
  usesEvents: ['profile.view', 'discover.card_view', 'click'],
  weights: WEIGHTS,
});
