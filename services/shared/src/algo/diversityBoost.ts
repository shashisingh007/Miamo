/**
 * Phase 16 \u2014 per-user diversity boost calculator.
 *
 * Driven by the user's recent swipe history: if the last N swipes-right
 * are all the same archetype (e.g. all `wordsmith`), bump the diversity
 * coefficient so the pipeline's S5 stage pushes other archetypes harder.
 *
 *   - history all same archetype, n>=5 \u2192 boost 1.3
 *   - top-archetype ratio >= 0.8, n>=5 \u2192 boost 1.15
 *   - else                                \u2192 boost 1.0 (neutral)
 *
 * Pure. Output is a multiplier the pipeline applies to its base diversity
 * weight; capped at 1.5 to prevent runaway behaviour.
 */
import type { MoveArchetype } from './moveProfile';

export type DiversityInputs = {
  recentArchetypes: MoveArchetype[]; // newest first or oldest first \u2014 order doesn't matter
};

export type DiversityBoost = {
  multiplier: number;
  reason: 'all_same' | 'dominant' | 'balanced' | 'insufficient_data';
  dominantArchetype: MoveArchetype | null;
};

const MIN_SAMPLE = 5;
const DOMINANCE_THRESHOLD = 0.8;
const BOOST_ALL_SAME = 1.3;
const BOOST_DOMINANT = 1.15;
const MAX_BOOST = 1.5;

export function diversityBoost(inp: DiversityInputs): DiversityBoost {
  const n = inp.recentArchetypes.length;
  if (n < MIN_SAMPLE) {
    return { multiplier: 1.0, reason: 'insufficient_data', dominantArchetype: null };
  }

  const counts: Partial<Record<MoveArchetype, number>> = {};
  for (const a of inp.recentArchetypes) counts[a] = (counts[a] ?? 0) + 1;

  let topArchetype: MoveArchetype | null = null;
  let topCount = 0;
  for (const [k, v] of Object.entries(counts)) {
    if ((v ?? 0) > topCount) { topCount = v ?? 0; topArchetype = k as MoveArchetype; }
  }
  const ratio = topCount / n;

  let multiplier = 1.0;
  let reason: DiversityBoost['reason'] = 'balanced';
  if (topCount === n)                       { multiplier = BOOST_ALL_SAME; reason = 'all_same'; }
  else if (ratio >= DOMINANCE_THRESHOLD)    { multiplier = BOOST_DOMINANT; reason = 'dominant'; }

  return {
    multiplier: Math.min(MAX_BOOST, multiplier),
    reason,
    dominantArchetype: topArchetype,
  };
}
