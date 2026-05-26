/**
 * v4 Discover — `new` filter. Surfaces recently-joined / recently-active
 * candidates without sacrificing quality. Replaces the legacy "show newest
 * profiles" sort which had no compatibility check.
 *
 * Formula (brief §2.2):
 *   40% recencyScore (createdAt half-life 7d)
 *   30% forYou.score / 100
 *   20% verifiedBoost (1 if photo+phone verified, else 0.3)
 *   10% completenessBoost (profile.completeness ∈ [0,1])
 */
import { expDecay, compose, clip100 } from './math';
import { scoreForYou, type ForYouInputs } from './forYou';
import type { AlgoConsentTag } from './consent';
import { registerAlgo } from './registry';

export const NEW_WEIGHTS = {
  recency: 0.40,
  forYou: 0.30,
  verified: 0.20,
  completeness: 0.10,
} as const;

export type NewInputs = ForYouInputs & {
  candCreatedAtMs: number;
  verified: boolean;
  completeness: number; // 0..1
};

export function scoreNew(inp: NewInputs): { score: number; explain: Record<string, unknown> } {
  const ageDays = Math.max(0, (Date.now() - inp.candCreatedAtMs) / 86400_000);
  const recency = expDecay(ageDays, 7);
  const fy = scoreForYou(inp);
  const breakdown = {
    recency,
    forYou: fy.score / 100,
    verified: inp.verified ? 1 : 0.3,
    completeness: Math.max(0, Math.min(1, inp.completeness)),
  };
  const score = clip100(compose(breakdown, NEW_WEIGHTS) * 100);
  return { score, explain: { algo: 'new', consentScope: inp.consent, breakdown, weights: NEW_WEIGHTS, finalScore: score, forYouExplain: fy.explain } };
}

registerAlgo({
  name: 'new',
  surface: 'discover',
  usesEvents: ['profile.view', 'discover.card_view', 'session.start'],
  weights: NEW_WEIGHTS,
});
