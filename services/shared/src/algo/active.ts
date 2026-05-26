/**
 * v4 Discover — `active` filter. Prioritises candidates likely to reply now.
 *
 * Formula (brief §2.3):
 *   35% liveness (session.heartbeat within last 30m → 1, decay 60m halflife)
 *   25% responseRate (FeatureSnapshot.responseRate ∈ [0,1])
 *   20% replySpeed (inv of replyPersonaP50Ms, 1 at <=30s, decay halflife 5m)
 *   10% forYou / 100
 *   10% chronoOverlap (uses helper from forYou)
 */
import { expDecay, compose, clip100 } from './math';
import { scoreForYou, chronoOverlap, type ForYouInputs } from './forYou';
import { registerAlgo } from './registry';

export const ACTIVE_WEIGHTS = {
  liveness: 0.35,
  responseRate: 0.25,
  replySpeed: 0.20,
  forYou: 0.10,
  chrono: 0.10,
} as const;

export type ActiveInputs = ForYouInputs & {
  candLastHeartbeatMs: number | null;
};

export function scoreActive(inp: ActiveInputs): { score: number; explain: Record<string, unknown> } {
  const minutesSinceBeat = inp.candLastHeartbeatMs == null
    ? Number.POSITIVE_INFINITY
    : Math.max(0, (Date.now() - inp.candLastHeartbeatMs) / 60_000);
  const liveness = Number.isFinite(minutesSinceBeat) ? expDecay(minutesSinceBeat, 60) : 0;
  const p50 = inp.cand?.replyPersonaP50Ms ?? null;
  const replySpeed = p50 == null ? null : expDecay(Math.max(0, p50 - 30_000) / 60_000, 5);
  const fy = scoreForYou(inp);
  const breakdown = {
    liveness,
    responseRate: inp.cand?.responseRate ?? null,
    replySpeed,
    forYou: fy.score / 100,
    chrono: chronoOverlap(inp.me?.chronotype ?? null, inp.cand?.chronotype ?? null),
  };
  const score = clip100(compose(breakdown, ACTIVE_WEIGHTS) * 100);
  return { score, explain: { algo: 'active', consentScope: inp.consent, breakdown, weights: ACTIVE_WEIGHTS, finalScore: score } };
}

registerAlgo({
  name: 'active',
  surface: 'discover',
  usesEvents: ['session.heartbeat', 'session.start', 'msg.send', 'msg.read'],
  weights: ACTIVE_WEIGHTS,
});
