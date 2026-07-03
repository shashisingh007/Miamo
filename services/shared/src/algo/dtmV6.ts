/**
 * dtmAffinityV6 — v6 Deep-Compat scorer.
 *
 * Additive over v4's flat `dtmAffinity`. v6 layers in:
 *
 *   1. Coverage gating  — sparse vectors (via `dtmColdStart`) blend the
 *      raw cosine toward a neutral prior (0.5). At stage='empty' returns
 *      null so the caller falls through.
 *   2. Topic weighting  — callers can supply a per-topic weight profile
 *      (e.g. inferred from which topics a user spends most time on). Falls
 *      back to uniform weights when absent.
 *   3. Shared-mass bonus — small bonus when both users have strong scalars
 *      on the same topics (rewards genuine overlap over coincidental
 *      cosine).
 *
 * Pure module. Registered in the algo registry behind ALGO_V6_DTM_ENABLED;
 * dispatcher returns v4 result when flag is off.
 */
import { cosine, cosTo01 } from './math';
import { dtmColdStart } from './dtmColdStart';
import { dtmAffinity, type DtmVector } from './dtm';
import { DTM_TOPIC_COUNT } from './dtmTopics';
import { registerAlgo } from './registry';

export type DtmTopicWeights = Float32Array | number[];

export type DtmAffinityV6Opts = {
  /** Per-topic weight profile (length 16). Falls back to uniform. */
  weights?: DtmTopicWeights | null;
  /** Shared-mass bonus cap (added to score after blending). Default 0.05. */
  sharedMassBonusMax?: number;
  /** Neutral prior the score blends toward when sparse. Default 0.5. */
  neutralPrior?: number;
};

export type DtmAffinityV6Report = {
  score: number;
  rawCosine: number;
  coverageWeight: number;
  sharedMassBonus: number;
  meStage: ReturnType<typeof dtmColdStart>['stage'];
  candStage: ReturnType<typeof dtmColdStart>['stage'];
};

function normaliseWeights(w: DtmTopicWeights | null | undefined): Float32Array {
  const out = new Float32Array(DTM_TOPIC_COUNT);
  if (!w || w.length === 0) {
    out.fill(1 / DTM_TOPIC_COUNT);
    return out;
  }
  let sum = 0;
  for (let i = 0; i < DTM_TOPIC_COUNT; i++) {
    const v = i < w.length ? w[i] : 0;
    const safe = Number.isFinite(v) && v > 0 ? v : 0;
    out[i] = safe;
    sum += safe;
  }
  if (sum === 0) {
    out.fill(1 / DTM_TOPIC_COUNT);
    return out;
  }
  for (let i = 0; i < DTM_TOPIC_COUNT; i++) out[i] /= sum;
  return out;
}

function weightedCosine(
  me: DtmVector,
  cand: DtmVector,
  weights: Float32Array,
): number {
  const n = Math.min(me.length, cand.length, weights.length);
  let dot = 0, ma = 0, mb = 0;
  for (let i = 0; i < n; i++) {
    const wa = me[i] * weights[i];
    const wb = cand[i] * weights[i];
    dot += wa * wb;
    ma += wa * wa;
    mb += wb * wb;
  }
  if (ma === 0 || mb === 0) return 0;
  return dot / Math.sqrt(ma * mb);
}

function sharedMass(me: DtmVector, cand: DtmVector): number {
  const n = Math.min(me.length, cand.length);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += Math.min(Math.abs(me[i]), Math.abs(cand[i]));
  }
  // me & cand are l2-normalised so each |xᵢ| ≤ 1 and Σxᵢ² = 1; the sum of
  // min(|aᵢ|,|bᵢ|) lives in [0, ~1]. Clamp into [0,1] defensively.
  return acc > 1 ? 1 : acc < 0 ? 0 : acc;
}

export function dtmAffinityV6(
  me: DtmVector | null,
  cand: DtmVector | null,
  opts: DtmAffinityV6Opts = {},
): DtmAffinityV6Report | null {
  if (!me || !cand) return null;
  if (me.length !== cand.length) return null;

  const meReport = dtmColdStart(me);
  const candReport = dtmColdStart(cand);
  if (meReport.stage === 'empty' || candReport.stage === 'empty') return null;

  const neutralPrior = opts.neutralPrior ?? 0.5;
  const sharedMassBonusMax = opts.sharedMassBonusMax ?? 0.05;

  const weights = normaliseWeights(opts.weights);
  const rawCosine = cosTo01(weightedCosine(me, cand, weights));

  // Coverage weight = min(both sides') affinity weight from cold-start.
  const coverageWeight = Math.min(meReport.affinityWeight, candReport.affinityWeight);
  const blended = coverageWeight * rawCosine + (1 - coverageWeight) * neutralPrior;

  const mass = sharedMass(me, cand);
  const bonus = sharedMassBonusMax * mass;

  let score = blended + bonus;
  if (score < 0) score = 0;
  if (score > 1) score = 1;

  return {
    score,
    rawCosine,
    coverageWeight,
    sharedMassBonus: bonus,
    meStage: meReport.stage,
    candStage: candReport.stage,
  };
}

import { v6FeatureEnabled } from './flags';

export function dtmAffinityDispatchV6(
  me: DtmVector | null,
  cand: DtmVector | null,
  opts: DtmAffinityV6Opts = {},
): number | null {
  if (v6FeatureEnabled('dtm')) {
    const r = dtmAffinityV6(me, cand, opts);
    return r ? r.score : null;
  }
  return dtmAffinity(me, cand);
}

registerAlgo({
  name: 'dtmV6',
  surface: 'deepCompat',
  usesEvents: ['dtm.question_view', 'dtm.answer', 'dtm.complete', 'session.end'],
  weights: { weightedCosine: 0.85, sharedMassBonus: 0.05, coverageBlend: 0.10 },
});
