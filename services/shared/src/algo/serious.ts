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
 *
 * // v2: audit doc flagged the strict-equality intent gate as too tight —
 * // a viewer with intent='marriage' rejects candidates with intent='serious'
 * // even though the two are adjacent. Relaxed to `SERIOUS_INTENTS.has(cand)`
 * // so both directions of the adjacency are accepted; the intentMatchScore
 * // 0.5 factor still penalises the mismatch inside the compose (design
 * // intent preserved).
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

/** v2: relaxed gate set — candidates in this set pass the intent gate.
 *  Previously required strict-equality between viewer and candidate. */
export const SERIOUS_INTENTS: ReadonlySet<string> = new Set(['serious', 'marriage']);

export type SeriousInputs = ForYouInputs & {
  dtmCompletes90d: number;
  lovelangCompat: number | null;
  completeness: number;
};

export function scoreSerious(inp: SeriousInputs): { score: number; explain: Record<string, unknown> } {
  // v2: gate now accepts either 'serious' or 'marriage' — matches "intent
  // in partner's allowed set" per audit. The intentMatchScore still
  // discounts the compose for non-exact matches so exact pairs still rank
  // above adjacent pairs (behaviour preserved for the top of the list).
  const ok = inp.candIntent !== null && SERIOUS_INTENTS.has(inp.candIntent);
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

import { v5FeatureEnabled } from './flags';
/** v5 reserved — identical to v4 today. */
export const scoreSeriousV4 = scoreSerious;
export function scoreSeriousV5(inp: SeriousInputs) {
  const r = scoreSeriousV4(inp);
  return { score: r.score, explain: { ...r.explain, algoVersion: 'v5' } };
}
export function scoreSeriousDispatch(inp: SeriousInputs) {
  return v5FeatureEnabled('serious') ? scoreSeriousV5(inp) : scoreSeriousV4(inp);
}

registerAlgo({
  name: 'serious',
  surface: 'discover',
  usesEvents: ['dtm.complete', 'dtm.answer', 'dtm.question_view'],
  weights: SERIOUS_WEIGHTS,
});
