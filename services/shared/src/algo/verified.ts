/**
 * v4 Discover — `verified` filter. Strict floor on verification, ranked by
 * forYou. Anyone failing the photo+phone+ID combo is dropped from the result
 * set entirely.
 *
 * Formula (brief §2.4):
 *   gate:  photoVerified && phoneVerified  (idVerified adds boost)
 *   60% forYou / 100
 *   25% idBoost (1 if ID verified, 0.4 else)
 *   15% antiSpamScore (1 - rageClickRate clipped)
 */
import { compose, clip100, clip01 } from './math';
import { scoreForYou, type ForYouInputs } from './forYou';
import { registerAlgo } from './registry';

export const VERIFIED_WEIGHTS = {
  forYou: 0.60,
  idBoost: 0.25,
  antiSpam: 0.15,
} as const;

export type VerifiedInputs = ForYouInputs & {
  photoVerified: boolean;
  phoneVerified: boolean;
  idVerified: boolean;
};

export function scoreVerified(inp: VerifiedInputs): { score: number; explain: Record<string, unknown> } {
  if (!inp.photoVerified || !inp.phoneVerified) {
    return { score: 0, explain: { algo: 'verified', consentScope: inp.consent, dropped: true, reason: 'photo/phone gate' } };
  }
  const fy = scoreForYou(inp);
  const breakdown = {
    forYou: fy.score / 100,
    idBoost: inp.idVerified ? 1 : 0.4,
    antiSpam: 1 - clip01(inp.cand?.rageClickRate ?? 0),
  };
  const score = clip100(compose(breakdown, VERIFIED_WEIGHTS) * 100);
  return { score, explain: { algo: 'verified', consentScope: inp.consent, breakdown, weights: VERIFIED_WEIGHTS, finalScore: score } };
}

import { v5FeatureEnabled } from './flags';

/** v5 reserved — identical to v4 today. */
export const scoreVerifiedV4 = scoreVerified;
export function scoreVerifiedV5(inp: VerifiedInputs) {
  const r = scoreVerifiedV4(inp);
  return { score: r.score, explain: { ...r.explain, algoVersion: 'v5' } };
}
export function scoreVerifiedDispatch(inp: VerifiedInputs) {
  return v5FeatureEnabled('verified') ? scoreVerifiedV5(inp) : scoreVerifiedV4(inp);
}

registerAlgo({
  name: 'verified',
  surface: 'discover',
  usesEvents: ['profile.view', 'click.rage', 'discover.card_view'],
  weights: VERIFIED_WEIGHTS,
});
