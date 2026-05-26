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
import type { SignalReader, FeatureRow, PairRow } from './signals';
import type { AlgoConsentTag } from './consent';
import { registerAlgo } from './registry';

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

export function scoreForYou(inp: ForYouInputs): { score: number; explain: Explain } {
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
  const [me, pairMap, priorMap, ...candFeatures] = await Promise.all([
    reader.features(myHash),
    reader.pairCompat(myHash, candHashes),
    reader.priorTargets(myHash, candHashes, 14),
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
    'discover.card_view', 'discover.swipe', 'dwell', 'scroll.depth',
    'click', 'click.rage', 'click.dead', 'session.heartbeat',
    'profile.view', 'msg.send',
  ],
  weights: FORYOU_WEIGHTS,
});
