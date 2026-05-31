/**
 * v6 Discover — `forYouV6` deep behavioural model.
 *
 * Implements the 12-ingredient recipe from MASTER_UPGRADE_PROMPT_V2 §3.
 * Additive over v5: same SignalReader, same caches, same Explain shape.
 * Reads optional v6 signals (sessionSummaries, focusAffinity, UserMoveProfile)
 * but degrades gracefully (returns 0.5 neutral) when they are absent.
 *
 * Recipe (sum = 1.000):
 *   interestsOverlap           0.18
 *   vibeAlignment              0.15
 *   behaviouralTwinIndex       0.15
 *   reciprocalIntentScore      0.10
 *   attentionFit               0.10
 *   hesitationFit              0.08
 *   chronotypeOverlap          0.07
 *   ageSimilarity              0.05
 *   distanceFit                0.05
 *   communicationCadenceFit    0.04
 *   moveStyleCompat            0.03
 *                              ────
 *                              1.00
 *
 * Penalties / boosts (applied after the weighted compose, before clip100):
 *   regretPenalty       linear in pair.regrets,        cap 8 points
 *   repeatPassPenalty   hard 15 points when repeatPasses >= 1
 *   returnBoost         linear in pair.returns,        cap +6 points
 *   windowShoppingDamp  -5 points when caller's last 3 sessions are all
 *                       windowShopping=true (recovers slowly)
 *   fatigue             2 * log1p(impressionsLast48h)
 *
 * The cache fast-path (PairCompatCache.v6Score if present, else finalScore)
 * is honoured. v6Score is written by the parallel v6 PairCompat worker
 * behind `ALGO_V6_PAIR_COMPAT_ENABLED`; until that worker ships, the v6
 * scorer falls through to the v4 cached score with v6 penalties applied.
 */
import { cosine, cosTo01, expDecay, logScale, compose, clip100, jaccard } from './math';
import type { SignalReader, FeatureRow, PairRow, PairBehavior, SessionSummaryRow } from './signals';
import type { AlgoConsentTag } from './consent';
import { registerAlgo } from './registry';
import { attentionFit, hesitationFit, chronoOverlap, intentMatchScore, type ForYouInputs, type Explain } from './forYou';

export const FORYOU_V6_WEIGHTS = {
  interestsOverlap:        0.18,
  vibeAlignment:           0.15,
  behaviouralTwinIndex:    0.15,
  reciprocalIntentScore:   0.10,
  attentionFit:            0.10,
  hesitationFit:           0.08,
  chronotypeOverlap:       0.07,
  ageSimilarity:           0.05,
  distanceFit:             0.05,
  communicationCadenceFit: 0.04,
  moveStyleCompat:         0.03,
} as const;

export const FORYOU_V6_PENALTIES = {
  regretMaxPoints: 8,
  repeatPassPoints: 15,
  returnBoostMaxPoints: 6,
  windowShoppingDampPoints: 5,
} as const;

const CACHE_FRESH_MS = 30 * 60 * 1000;

/** v6 inputs: a superset of ForYouInputs with optional v6 signals.
 *  All optional fields fall back to neutral (0.5) when absent so the
 *  scorer is safe to call before the v6 data plane is fully populated. */
export type ForYouV6Inputs = ForYouInputs & {
  /** caller's last N session summaries (most recent first). */
  mySessions?: SessionSummaryRow[];
  /** candidate's Miamo Move archetype (Phase 4). */
  candArchetype?: string | null;
  /** caller's Miamo Move archetype. */
  myArchetype?: string | null;
  /** caller's median reply latency in ms (from FeatureSnapshot). */
  myReplyP50Ms?: number | null;
  /** candidate's median reply latency in ms. */
  candReplyP50Ms?: number | null;
};

/** Reciprocal intent: does this candidate's recent behaviour suggest they
 *  would reciprocate our intent? Proxy: intentMatchScore + 0.2 * candidate
 *  has any recent quality-interaction in last 7d. Falls back to v5
 *  intentMatchScore when behaviour signals are absent. 0..1. */
export function reciprocalIntentScore(
  myIntent: string | null,
  candIntent: string | null,
  candHasRecentQualityActivity?: boolean,
): number {
  const base = intentMatchScore(myIntent, candIntent);
  if (candHasRecentQualityActivity === true)  return Math.min(1, base + 0.20);
  if (candHasRecentQualityActivity === false) return Math.max(0, base - 0.10);
  return base;
}

/** Communication cadence fit: are our reply times compatible?
 *  exp-decay over |my_p50 - cand_p50| with 60s halflife. 0..1. */
export function communicationCadenceFit(myMs: number | null, candMs: number | null): number {
  if (myMs == null || candMs == null) return 0.5;
  const deltaSec = Math.abs(myMs - candMs) / 1000;
  return expDecay(deltaSec, 60);
}

/** Move style compat: are our Miamo Move archetypes a good pair?
 *  Same archetype = 1.0, complementary pairs = 0.7, opposite = 0.3, unknown = 0.5. */
export function moveStyleCompat(a: string | null | undefined, b: string | null | undefined): number {
  if (!a || !b) return 0.5;
  if (a === b) return 1.0;
  const complementary = new Set([
    'wordsmith,voice_first', 'voice_first,wordsmith',
    'visual,wordsmith', 'wordsmith,visual',
    'fast_replier,wordsmith', 'wordsmith,fast_replier',
  ]);
  if (complementary.has(`${a},${b}`)) return 0.7;
  const opposite = new Set([
    'wordsmith,visual',     // already complementary; keep symmetric
    'voice_first,visual', 'visual,voice_first',
  ]);
  if (opposite.has(`${a},${b}`)) return 0.3;
  return 0.5;
}

/** Window-shopping signal: if caller's last 3 session summaries are all
 *  windowShopping=true, apply a small damp (encourages them to commit to
 *  a card before showing more shiny new ones). */
function windowShoppingDamp(sessions: SessionSummaryRow[] | undefined): number {
  if (!sessions || sessions.length < 3) return 0;
  const last3 = sessions.slice(0, 3);
  if (last3.every((s) => s.windowShopping)) return FORYOU_V6_PENALTIES.windowShoppingDampPoints;
  return 0;
}

export function scoreForYouV6(inp: ForYouV6Inputs): { score: number; explain: Explain } {
  const {
    me, cand, pair, priorCount, impressionsLast48h, consent, behavior,
    mySessions, candArchetype, myArchetype, myReplyP50Ms, candReplyP50Ms,
  } = inp;
  const W = FORYOU_V6_WEIGHTS;
  const P = FORYOU_V6_PENALTIES;
  const b: PairBehavior = behavior ?? { regrets: 0, repeatPasses: 0, returns: 0, maxDwellMs: 0 };

  const regretPenalty = Math.min(P.regretMaxPoints, b.regrets * 2);
  const repeatPassPenalty = b.repeatPasses >= 1 ? P.repeatPassPoints : 0;
  const returnBoost = Math.min(P.returnBoostMaxPoints, b.returns * 3);
  const wsDamp = windowShoppingDamp(mySessions);
  const fatigue = 2 * Math.log1p(impressionsLast48h);

  // Cache fast-path: prefer v6Score if the v6 PairCompat worker has run;
  // else fall back to finalScore (v4-equivalent) with v6 adjustments on top.
  if (pair && Date.now() - new Date(pair.computedAt).getTime() < CACHE_FRESH_MS) {
    const base = (pair as PairRow & { v6Score?: number | null }).v6Score ?? pair.finalScore;
    const score = clip100(base * 100 - fatigue - regretPenalty - repeatPassPenalty - wsDamp + returnBoost);
    return {
      score,
      explain: {
        algo: 'forYouV6', consentScope: consent, cacheHit: true,
        breakdown: {
          interestsOverlap: pair.interestCos,
          vibeAlignment: pair.vibeCos,
          behaviouralTwinIndex: pair.behaviorCos,
          chronotypeOverlap: pair.chronoOverlap,
          regretPenalty: -regretPenalty,
          repeatPassPenalty: -repeatPassPenalty,
          returnBoost,
          windowShoppingDamp: -wsDamp,
        },
        weights: { ...W },
        fatiguePenalty: fatigue,
        finalScore: score,
      },
    };
  }

  // Cold path: compute all 11 ingredients from feature snapshots + v6 signals.
  const candRecent = b.returns > 0 || b.maxDwellMs > 2000; // proxy for "quality activity"
  const breakdown: Record<string, number | null> = {
    interestsOverlap:
      me?.interestVec && cand?.interestVec
        ? cosTo01(cosine(me.interestVec, cand.interestVec))
        : (inp.myInterests.length && inp.candInterests.length ? jaccard(inp.myInterests, inp.candInterests) : null),
    vibeAlignment:
      me?.vibeEmb && cand?.vibeEmb ? cosTo01(cosine(me.vibeEmb, cand.vibeEmb)) : null,
    behaviouralTwinIndex:
      me?.behaviorEmb && cand?.behaviorEmb ? cosTo01(cosine(me.behaviorEmb, cand.behaviorEmb)) : null,
    reciprocalIntentScore: reciprocalIntentScore(inp.myIntent, inp.candIntent, candRecent),
    attentionFit: attentionFit(me, cand),
    hesitationFit: hesitationFit(me, cand),
    chronotypeOverlap: chronoOverlap(me?.chronotype ?? null, cand?.chronotype ?? null),
    ageSimilarity:
      inp.myAge != null && inp.candAge != null ? expDecay(Math.abs(inp.myAge - inp.candAge), 8) : null,
    distanceFit: inp.cityKm != null ? expDecay(inp.cityKm, 50) : null,
    communicationCadenceFit: communicationCadenceFit(myReplyP50Ms ?? me?.replyPersonaP50Ms ?? null, candReplyP50Ms ?? cand?.replyPersonaP50Ms ?? null),
    moveStyleCompat: moveStyleCompat(myArchetype ?? null, candArchetype ?? null),
  };

  // priorCount feeds an implicit boost (not in the recipe sum) — kept small.
  const priorBoost = logScale(priorCount, 1000) * 4; // 0..4 points
  const raw = compose(breakdown, W) * 100;
  const score = clip100(raw + priorBoost - fatigue - regretPenalty - repeatPassPenalty - wsDamp + returnBoost);

  return {
    score,
    explain: {
      algo: 'forYouV6', consentScope: consent, cacheHit: false,
      breakdown: {
        ...breakdown,
        priorBoost,
        regretPenalty: -regretPenalty,
        repeatPassPenalty: -repeatPassPenalty,
        returnBoost,
        windowShoppingDamp: -wsDamp,
      },
      weights: { ...W },
      fatiguePenalty: fatigue,
      finalScore: score,
    },
  };
}

/** Bulk discover scorer for v6. Mirrors `rankForYou` but optionally pulls
 *  session summaries when the v6 flag is on. */
export async function rankForYouV6(
  reader: SignalReader,
  myId: string,
  cands: Array<{ id: string; intent: string | null; age: number | null; interests: string[]; cityKm: number | null; archetype?: string | null }>,
  consent: AlgoConsentTag,
  opts: { impressions?: Map<string, number>; myArchetype?: string | null } = {},
): Promise<Array<{ id: string; score: number; explain: Explain }>> {
  const myHash = reader.hashOf(myId);
  const candHashes = cands.map((c) => reader.hashOf(c.id));
  const impressions = opts.impressions ?? new Map<string, number>();
  const [me, pairMap, priorMap, behaviorMap, mySessions, ...candFeatures] = await Promise.all([
    reader.features(myHash),
    reader.pairCompat(myHash, candHashes),
    reader.priorTargets(myHash, candHashes, 14),
    reader.pairBehavior(myHash, candHashes, 14),
    reader.sessionSummaries ? reader.sessionSummaries(myHash, 7) : Promise.resolve([] as SessionSummaryRow[]),
    ...candHashes.map((h) => reader.features(h)),
  ]);
  const out: Array<{ id: string; score: number; explain: Explain }> = [];
  for (let i = 0; i < cands.length; i++) {
    const c = cands[i];
    const cHash = candHashes[i];
    const { score, explain } = scoreForYouV6({
      me, cand: candFeatures[i] ?? null,
      myIntent: null, candIntent: c.intent,
      myAge: null, candAge: c.age,
      cityKm: c.cityKm,
      myInterests: [], candInterests: c.interests,
      pair: pairMap.get(cHash),
      priorCount: priorMap.get(cHash) || 0,
      impressionsLast48h: impressions.get(c.id) || 0,
      consent,
      behavior: behaviorMap.get(cHash),
      mySessions,
      candArchetype: c.archetype ?? null,
      myArchetype: opts.myArchetype ?? null,
    });
    out.push({ id: c.id, score, explain });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

registerAlgo({
  name: 'forYouV6',
  surface: 'discover',
  usesEvents: [
    // v6 claims the total-state events it consumes (so signal-coverage CI
    // guard moves them out of OPERATIONAL_EVENTS as v6 ramps up).
    'attention.idle.enter',
    'attention.idle.exit',
    'nav.route',
    'session.summary',
    'profile.self_view_dwell',
    'intent.dwell',
  ],
  weights: FORYOU_V6_WEIGHTS,
});
