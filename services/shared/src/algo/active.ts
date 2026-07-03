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
import { v5FeatureEnabled } from './flags';

export const ACTIVE_WEIGHTS = {
  liveness: 0.35,
  responseRate: 0.25,
  replySpeed: 0.20,
  forYou: 0.10,
  chrono: 0.10,
} as const;

/**
 * v5 — same shape as v4, but `liveness` is replaced with `livenessSmooth`,
 * which folds in *any* recent activity (heartbeats, attention pings, swipe
 * commits, msg.send) rather than only `session.heartbeat`. The decay
 * function itself is unchanged (60-min half-life), so the score range and
 * monotonicity guarantees match v4 — only the input is broader.
 */
export const ACTIVE_V5_WEIGHTS = ACTIVE_WEIGHTS;

export type ActiveInputs = ForYouInputs & {
  candLastHeartbeatMs: number | null;
  /**
   * v5 only. Most recent ms-since-epoch the candidate generated *any* signal
   * we observe (heartbeat, attention.return, swipe.commit, msg.send, etc.).
   * When undefined, v5 transparently falls back to `candLastHeartbeatMs`.
   */
  candLastAnyActivityMs?: number | null;
};

export function scoreActive(inp: ActiveInputs): { score: number; explain: Record<string, unknown> } {
  return v5FeatureEnabled('active') ? scoreActiveV5(inp) : scoreActiveV4(inp);
}

/** v4 (original) — kept verbatim for the dispatcher. */
export function scoreActiveV4(inp: ActiveInputs): { score: number; explain: Record<string, unknown> } {
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
  return { score, explain: { algo: 'active', algoVersion: 'v4', consentScope: inp.consent, breakdown, weights: ACTIVE_WEIGHTS, finalScore: score } };
}

/**
 * v5 — uses `candLastAnyActivityMs` when available so brief background
 * activity (attention pings, in-app navigation) still flags a user as
 * "active". Falls back to heartbeat when v4 data is the only thing the
 * caller supplied — guaranteeing v5 never scores *lower* than v4 for the
 * same candidate.
 */
export function scoreActiveV5(inp: ActiveInputs): { score: number; explain: Record<string, unknown> } {
  const lastAny = inp.candLastAnyActivityMs ?? inp.candLastHeartbeatMs;
  const minutesSinceAny = lastAny == null
    ? Number.POSITIVE_INFINITY
    : Math.max(0, (Date.now() - lastAny) / 60_000);
  const livenessSmooth = Number.isFinite(minutesSinceAny) ? expDecay(minutesSinceAny, 60) : 0;
  const p50 = inp.cand?.replyPersonaP50Ms ?? null;
  const replySpeed = p50 == null ? null : expDecay(Math.max(0, p50 - 30_000) / 60_000, 5);
  const fy = scoreForYou(inp);
  const breakdown = {
    liveness: livenessSmooth,
    responseRate: inp.cand?.responseRate ?? null,
    replySpeed,
    forYou: fy.score / 100,
    chrono: chronoOverlap(inp.me?.chronotype ?? null, inp.cand?.chronotype ?? null),
  };
  const score = clip100(compose(breakdown, ACTIVE_V5_WEIGHTS) * 100);
  return { score, explain: { algo: 'active', algoVersion: 'v5', consentScope: inp.consent, breakdown, weights: ACTIVE_V5_WEIGHTS, finalScore: score, usedAnyActivity: inp.candLastAnyActivityMs != null } };
}

registerAlgo({
  name: 'active',
  surface: 'discover',
  usesEvents: ['session.heartbeat', 'session.start', 'msg.send', 'msg.read',
    // v5 — any signal counts toward liveness:
    'attention.return', 'attention.long_heartbeat', 'swipe.commit'],
  weights: ACTIVE_WEIGHTS,
});
