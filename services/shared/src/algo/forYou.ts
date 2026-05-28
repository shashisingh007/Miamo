/**
 * v4 Discover — `forYou` filter.
 *
 * The canonical example: every other Discover filter follows the same shape
 * (load signals, build breakdown, compose with weights, return score +
 * explain). All inputs come through SignalReader so this file has zero
 * Prisma imports.
 *
 * Cache-hit fast path: if PairCompatCache has a fresh row (< 30 min) we
 * return its finalScore × 100 directly and skip recomputation. The cold path
 * computes from the user/candidate FeatureSnapshots.
 */
import { cosine, cosTo01, expDecay, logScale, compose, clip100, jaccard } from './math';
import type { SignalReader, FeatureRow, PairRow, PairBehavior } from './signals';
import type { AlgoConsentTag } from './consent';
import { registerAlgo } from './registry';
import { v5FeatureEnabled } from './flags';

export const FORYOU_WEIGHTS = {
  interestCos: 0.25,
  vibeCos: 0.20,
  behaviorCos: 0.20,
  chronoOverlap: 0.10,
  prior: 0.10,
  intentMatch: 0.05,
  distance: 0.05,
  ageDelta: 0.05,
} as const;

/**
 * v5 weights — re-balanced to make room for two new terms while keeping the
 * sum at exactly 1.0. New terms:
 *   - attentionFit   how well the candidate's typical dwell histogram aligns
 *                    with this user's attentionProfile (reader / scanner).
 *   - hesitationFit  exp-decay match between this user's median decision
 *                    latency and the candidate's. Compatible reaction speeds
 *                    correlate with mutual message-back rates.
 */
export const FORYOU_V5_WEIGHTS = {
  interestCos: 0.22,
  vibeCos: 0.18,
  behaviorCos: 0.18,
  chronoOverlap: 0.10,
  prior: 0.10,
  intentMatch: 0.05,
  distance: 0.05,
  ageDelta: 0.04,
  attentionFit: 0.04,
  hesitationFit: 0.04,
} as const;

/** v5 penalties (subtracted after compose, before clip). Tuned for the
 *  forYou north-star: mutual quality interaction (>=10 messages over >=2d). */
export const FORYOU_V5_PENALTIES = {
  /** linear in regret count, capped at 8 points off */
  regretMaxPoints: 8,
  /** hard 15 point penalty once a candidate has been shown >=2x AND passed */
  repeatPassPoints: 15,
  /** up to +6 boost for in-session returns (intent.profile.settle) */
  returnBoostMaxPoints: 6,
} as const;

const CACHE_FRESH_MS = 30 * 60 * 1000;

export type ForYouInputs = {
  me: FeatureRow | null;
  cand: FeatureRow | null;
  myIntent: string | null;
  candIntent: string | null;
  myAge: number | null;
  candAge: number | null;
  cityKm: number | null;
  myInterests: string[];
  candInterests: string[];
  pair: PairRow | undefined;
  priorCount: number;
  impressionsLast48h: number;
  consent: AlgoConsentTag;
  /** v5 (optional): per-pair behaviour signals. Ignored if v5 flag is off. */
  behavior?: PairBehavior;
};

export type Explain = {
  algo: string;
  consentScope: AlgoConsentTag;
  breakdown: Record<string, number | null>;
  weights: Record<string, number>;
  cacheHit: boolean;
  fatiguePenalty: number;
  finalScore: number;
};

export function chronoOverlap(a: string | null, b: string | null): number {
  if (!a || !b) return 0.5;
  if (a === b) return 1;
  if (a === 'mixed' || b === 'mixed') return 0.6;
  return 0.2;
}

export function intentMatchScore(a: string | null, b: string | null): number {
  if (!a || !b) return 0.5;
  if (a === b) return 1;
  const adjacent = new Set(['casual,friends', 'friends,casual', 'serious,marriage', 'marriage,serious']);
  return adjacent.has(`${a},${b}`) ? 0.5 : 0;
}

/** v5: attentionFit — cosine between dwell histograms, with a default
 *  uniform fallback when the candidate has no histogram yet. 0..1. */
export function attentionFit(me: FeatureRow | null, cand: FeatureRow | null): number {
  const a = me?.dwellHistogram ?? null;
  const b = cand?.dwellHistogram ?? null;
  if (!a || !b || a.length !== b.length || a.length === 0) return 0.5;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (na === 0 || nb === 0) return 0.5;
  const c = dot / Math.sqrt(na * nb);
  return Math.max(0, Math.min(1, (c + 1) / 2));
}

/** v5: hesitationFit — exp-decay over the absolute difference in median
 *  decision latencies. Same-speed deciders trend to mutual-back; very
 *  different speeds tend to dead conversations. */
export function hesitationFit(me: FeatureRow | null, cand: FeatureRow | null): number {
  const ams = me?.hesitationP50Ms ?? null;
  const bms = cand?.hesitationP50Ms ?? null;
  if (ams == null || bms == null) return 0.5;
  const deltaSec = Math.abs(ams - bms) / 1000;
  return expDecay(deltaSec, 8);  // 8s halflife
}

export function scoreForYouV4(inp: ForYouInputs): { score: number; explain: Explain } {
  const { me, cand, pair, priorCount, impressionsLast48h, consent } = inp;

  // Cache hit short-circuit — finalScore in cache is 0..1 (see compat writer).
  if (pair && Date.now() - new Date(pair.computedAt).getTime() < CACHE_FRESH_MS) {
    const fatigue = 2 * Math.log1p(impressionsLast48h);
    const score = clip100(pair.finalScore * 100 - fatigue);
    return {
      score,
      explain: {
        algo: 'forYou', consentScope: consent, cacheHit: true,
        breakdown: {
          interestCos: pair.interestCos, vibeCos: pair.vibeCos, behaviorCos: pair.behaviorCos,
          chronoOverlap: pair.chronoOverlap, prior: pair.priorInteractionScore,
          intentMatch: null, distance: null, ageDelta: null,
        },
        weights: { ...FORYOU_WEIGHTS },
        fatiguePenalty: fatigue,
        finalScore: score,
      },
    };
  }

  // Cold path: derive everything from FeatureSnapshots.
  const breakdown: Record<string, number | null> = {
    interestCos: me?.interestVec && cand?.interestVec ? cosTo01(cosine(me.interestVec, cand.interestVec)) : null,
    vibeCos:     me?.vibeEmb     && cand?.vibeEmb     ? cosTo01(cosine(me.vibeEmb, cand.vibeEmb)) : null,
    behaviorCos: me?.behaviorEmb && cand?.behaviorEmb ? cosTo01(cosine(me.behaviorEmb, cand.behaviorEmb)) : null,
    chronoOverlap: chronoOverlap(me?.chronotype ?? null, cand?.chronotype ?? null),
    prior: logScale(priorCount, 1000),
    intentMatch: intentMatchScore(inp.myIntent, inp.candIntent),
    distance: inp.cityKm != null ? expDecay(inp.cityKm, 50) : null,
    ageDelta: inp.myAge != null && inp.candAge != null ? expDecay(Math.abs(inp.myAge - inp.candAge), 8) : null,
  };

  // Interest overlap supplements interestCos for cold-start candidates.
  if (breakdown.interestCos == null && inp.myInterests.length && inp.candInterests.length) {
    breakdown.interestCos = jaccard(inp.myInterests, inp.candInterests);
  }

  const fatigue = 2 * Math.log1p(impressionsLast48h);
  const raw = compose(breakdown, FORYOU_WEIGHTS) * 100;
  const score = clip100(raw - fatigue);

  return {
    score,
    explain: {
      algo: 'forYou', consentScope: consent, cacheHit: false,
      breakdown, weights: { ...FORYOU_WEIGHTS },
      fatiguePenalty: fatigue, finalScore: score,
    },
  };
}

/**
 * v5: same shape as V4 but reads two extra signals (attentionFit,
 * hesitationFit) and applies three behaviour-driven adjustments before the
 * final clip:
 *   - regretPenalty: linear in `behavior.regrets`, capped at 8 points
 *   - repeatPassPenalty: hard 15 points if `behavior.repeatPasses >= 1`
 *   - returnBoost: capped +6 if `behavior.returns > 0`
 * The cache fast-path is still respected; the v5 adjustments are applied on
 * top of the cached score so PairCompatCache stays version-agnostic.
 */
export function scoreForYouV5(inp: ForYouInputs): { score: number; explain: Explain } {
  const { me, cand, pair, priorCount, impressionsLast48h, consent, behavior } = inp;
  const W = FORYOU_V5_WEIGHTS;
  const P = FORYOU_V5_PENALTIES;
  const b = behavior ?? { regrets: 0, repeatPasses: 0, returns: 0, maxDwellMs: 0 };

  const regretPenalty = Math.min(P.regretMaxPoints, b.regrets * 2);
  const repeatPassPenalty = b.repeatPasses >= 1 ? P.repeatPassPoints : 0;
  const returnBoost = Math.min(P.returnBoostMaxPoints, b.returns * 3);

  // Fast path: cached pair score (0..1) -> apply v5 adjustments on top.
  if (pair && Date.now() - new Date(pair.computedAt).getTime() < CACHE_FRESH_MS) {
    const fatigue = 2 * Math.log1p(impressionsLast48h);
    const score = clip100(pair.finalScore * 100 - fatigue - regretPenalty - repeatPassPenalty + returnBoost);
    return {
      score,
      explain: {
        algo: 'forYou', consentScope: consent, cacheHit: true,
        breakdown: {
          interestCos: pair.interestCos, vibeCos: pair.vibeCos, behaviorCos: pair.behaviorCos,
          chronoOverlap: pair.chronoOverlap, prior: pair.priorInteractionScore,
          intentMatch: null, distance: null, ageDelta: null,
          attentionFit: null, hesitationFit: null,
          regretPenalty: -regretPenalty, repeatPassPenalty: -repeatPassPenalty, returnBoost,
        },
        weights: { ...W },
        fatiguePenalty: fatigue,
        finalScore: score,
      },
    };
  }

  const breakdown: Record<string, number | null> = {
    interestCos:   me?.interestVec && cand?.interestVec ? cosTo01(cosine(me.interestVec, cand.interestVec)) : null,
    vibeCos:       me?.vibeEmb     && cand?.vibeEmb     ? cosTo01(cosine(me.vibeEmb, cand.vibeEmb)) : null,
    behaviorCos:   me?.behaviorEmb && cand?.behaviorEmb ? cosTo01(cosine(me.behaviorEmb, cand.behaviorEmb)) : null,
    chronoOverlap: chronoOverlap(me?.chronotype ?? null, cand?.chronotype ?? null),
    prior:         logScale(priorCount, 1000),
    intentMatch:   intentMatchScore(inp.myIntent, inp.candIntent),
    distance:      inp.cityKm != null ? expDecay(inp.cityKm, 50) : null,
    ageDelta:      inp.myAge != null && inp.candAge != null ? expDecay(Math.abs(inp.myAge - inp.candAge), 8) : null,
    attentionFit:  attentionFit(me, cand),
    hesitationFit: hesitationFit(me, cand),
  };

  if (breakdown.interestCos == null && inp.myInterests.length && inp.candInterests.length) {
    breakdown.interestCos = jaccard(inp.myInterests, inp.candInterests);
  }

  const fatigue = 2 * Math.log1p(impressionsLast48h);
  const raw = compose(breakdown, W) * 100;
  const score = clip100(raw - fatigue - regretPenalty - repeatPassPenalty + returnBoost);

  return {
    score,
    explain: {
      algo: 'forYou', consentScope: consent, cacheHit: false,
      breakdown: {
        ...breakdown,
        regretPenalty: -regretPenalty,
        repeatPassPenalty: -repeatPassPenalty,
        returnBoost,
      },
      weights: { ...W },
      fatiguePenalty: fatigue,
      finalScore: score,
    },
  };
}

/** Dispatcher: returns v5 when the feature flag is on; otherwise v4. */
export function scoreForYou(inp: ForYouInputs): { score: number; explain: Explain } {
  return v5FeatureEnabled('forYou') ? scoreForYouV5(inp) : scoreForYouV4(inp);
}

/**
 * Bulk discover scorer: given me + a batch of candidates, returns scored
 * entries sorted desc. Uses the SignalReader to fetch features in two
 * calls (me + pairCompat batch + per-cand features pulled together).
 */
export async function rankForYou(
  reader: SignalReader,
  myId: string,
  cands: Array<{ id: string; intent: string | null; age: number | null; interests: string[]; cityKm: number | null }>,
  consent: AlgoConsentTag,
  impressions: Map<string, number> = new Map(),
): Promise<Array<{ id: string; score: number; explain: Explain }>> {
  const myHash = reader.hashOf(myId);
  const candHashes = cands.map((c) => reader.hashOf(c.id));
  // v5 reads one extra signal map (pairBehavior). Fetched unconditionally —
  // the extra query is cheap and lets the same code path serve both versions.
  const [me, pairMap, priorMap, behaviorMap, ...candFeatures] = await Promise.all([
    reader.features(myHash),
    reader.pairCompat(myHash, candHashes),
    reader.priorTargets(myHash, candHashes, 14),
    reader.pairBehavior(myHash, candHashes, 14),
    ...candHashes.map((h) => reader.features(h)),
  ]);
  const myIntent = null; // caller should pass via cand entries below if needed
  const myAge = null;
  const myInterests: string[] = [];
  const out: Array<{ id: string; score: number; explain: Explain }> = [];
  for (let i = 0; i < cands.length; i++) {
    const c = cands[i];
    const cHash = candHashes[i];
    const { score, explain } = scoreForYou({
      me, cand: candFeatures[i] ?? null,
      myIntent, candIntent: c.intent,
      myAge, candAge: c.age,
      cityKm: c.cityKm,
      myInterests, candInterests: c.interests,
      pair: pairMap.get(cHash),
      priorCount: priorMap.get(cHash) || 0,
      impressionsLast48h: impressions.get(c.id) || 0,
      consent,
      behavior: behaviorMap.get(cHash),
    });
    out.push({ id: c.id, score, explain });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

registerAlgo({
  name: 'forYou',
  surface: 'discover',
  usesEvents: [
    'discover.card_view', 'discover.swipe', 'scroll.depth',
    'click', 'click.rage', 'click.dead', 'session.heartbeat',
    'profile.view', 'msg.send',
    // v4/v5 additions
    'card.impression.50', 'card.impression.100', 'card.bio.expand',
    'swipe.start', 'swipe.commit', 'swipe.undo', 'swipe.regret', 'swipe.repeat_pass',
    'attention.idle', 'attention.away', 'attention.return', 'intent.profile.settle',
  ],
  weights: FORYOU_WEIGHTS,
});
