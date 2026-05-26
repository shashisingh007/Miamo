/**
 * v4 Discover — `serious` filter. Intent-locked ranker for users seeking
 * long-term / marriage.
 *
 * Formula (brief §2.5):
 *   gate:   candIntent ∈ {serious, marriage}; else dropped
 *   30% forYou / 100
 *   25% dtmDepth (count(dtm.complete events 90d) / 5, logScale)
 *   15% lovelangCompatibility (cached match-score from compat worker, 0..1)
 *   15% completenessBoost
 *   15% intentMatch (1 if exact, 0.5 if adjacent serious↔marriage)
 */
import { compose, logScale, clip100 } from './math';
import { scoreForYou, intentMatchScore, type ForYouInputs } from './forYou';
import { registerAlgo } from './registry';

export const SERIOUS_WEIGHTS = {
  forYou: 0.30,
  dtmDepth: 0.25,
  lovelang: 0.15,
  completeness: 0.15,
  intentMatch: 0.15,
} as const;

export type SeriousInputs = ForYouInputs & {
  dtmCompletes90d: number;
  lovelangCompat: number | null;
  completeness: number;
};

export function scoreSerious(inp: SeriousInputs): { score: number; explain: Record<string, unknown> } {
  const ok = inp.candIntent === 'serious' || inp.candIntent === 'marriage';
  if (!ok) return { score: 0, explain: { algo: 'serious', consentScope: inp.consent, dropped: true, reason: 'intent gate' } };
  const fy = scoreForYou(inp);
  const breakdown = {
    forYou: fy.score / 100,
    dtmDepth: logScale(inp.dtmCompletes90d, 5),
    lovelang: inp.lovelangCompat,
    completeness: Math.max(0, Math.min(1, inp.completeness)),
    intentMatch: intentMatchScore(inp.myIntent, inp.candIntent),
  };
  const score = clip100(compose(breakdown, SERIOUS_WEIGHTS) * 100);
  return { score, explain: { algo: 'serious', consentScope: inp.consent, breakdown, weights: SERIOUS_WEIGHTS, finalScore: score } };
}

registerAlgo({
  name: 'serious',
  surface: 'discover',
  usesEvents: ['dtm.complete', 'dtm.answer', 'dtm.question_view'],
  weights: SERIOUS_WEIGHTS,
});
