/**
 * v6 Pair-compat static scorer — Phase 17 batch writer side.
 *
 * Computes a session-agnostic v6 "static" score for a pair of users from
 * their FeatureSnapshot rows alone. Designed to be written to
 * `PairCompatCache.v6Score` by the tracking-worker, then consumed by the
 * `forYouV6` cache fast-path.
 *
 * The static scorer uses only the cosine-based and demographic ingredients
 * from the v6 recipe (behaviour-driven terms are computed at request time
 * by `forYouV6` itself). It is intentionally cheap so it can run for tens
 * of thousands of pairs per worker tick.
 *
 * Static ingredients (renormalised to sum = 1.0):
 *   interestsOverlap         0.30
 *   vibeAlignment            0.25
 *   behaviouralTwinIndex     0.20
 *   chronotypeOverlap        0.12
 *   ageSimilarity            0.07
 *   distanceFit              0.06
 *
 * Behavioural ingredients (reciprocalIntentScore, attentionFit,
 * hesitationFit, communicationCadenceFit, moveStyleCompat) are NOT in this
 * static score — they are session/pair-state-dependent and applied live by
 * the request-time ranker.
 */
import { cosine, cosTo01, expDecay } from './math';
import type { FeatureRow } from './signals';

export const PAIR_V6_STATIC_WEIGHTS = {
  interestsOverlap:     0.30,
  vibeAlignment:        0.25,
  behaviouralTwinIndex: 0.20,
  chronotypeOverlap:    0.12,
  ageSimilarity:        0.07,
  distanceFit:          0.06,
} as const;

export type PairV6StaticInputs = {
  a: FeatureRow | null;
  b: FeatureRow | null;
  aAge: number | null;
  bAge: number | null;
  /** city-to-city km; null if unknown. */
  cityKm: number | null;
};

export type PairV6Static = {
  /** v6Score in 0..1, ready to write into PairCompatCache.v6Score. */
  v6Score: number;
  breakdown: Record<keyof typeof PAIR_V6_STATIC_WEIGHTS, number>;
};

/** Compute the static v6 score for a pair. Always returns a value in [0, 1]. */
export function scorePairV6(inp: PairV6StaticInputs): PairV6Static {
  const { a, b } = inp;

  const interestsOverlap =
    a?.interestVec && b?.interestVec ? cosTo01(cosine(a.interestVec, b.interestVec)) : 0.5;
  const vibeAlignment =
    a?.vibeEmb && b?.vibeEmb ? cosTo01(cosine(a.vibeEmb, b.vibeEmb)) : 0.5;
  const behaviouralTwinIndex =
    a?.behaviorEmb && b?.behaviorEmb ? cosTo01(cosine(a.behaviorEmb, b.behaviorEmb)) : 0.5;
  const chronotypeOverlap = chronoOverlap(a?.chronotype ?? null, b?.chronotype ?? null);
  const ageSimilarity =
    inp.aAge != null && inp.bAge != null ? expDecay(Math.abs(inp.aAge - inp.bAge), 8) : 0.5;
  const distanceFit = inp.cityKm != null ? expDecay(inp.cityKm, 50) : 0.5;

  const breakdown = {
    interestsOverlap, vibeAlignment, behaviouralTwinIndex,
    chronotypeOverlap, ageSimilarity, distanceFit,
  };

  let raw = 0;
  for (const k of Object.keys(PAIR_V6_STATIC_WEIGHTS) as Array<keyof typeof PAIR_V6_STATIC_WEIGHTS>) {
    raw += (PAIR_V6_STATIC_WEIGHTS[k] as number) * breakdown[k];
  }

  return { v6Score: Math.max(0, Math.min(1, raw)), breakdown };
}

function chronoOverlap(a: string | null, b: string | null): number {
  if (!a || !b) return 0.5;
  if (a === b) return 1;
  if (a === 'mixed' || b === 'mixed') return 0.6;
  return 0.2;
}
