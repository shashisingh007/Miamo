/**
 * v4 Discover — `aiPicks` ensemble.
 *
 * Sum of weighted scores from sub-models. Each sub-model returns 0..100 and
 * may itself be a v4 algorithm or a cheap heuristic. The ensemble also
 * injects ~10% epsilon-greedy exploration so the bandit can discover
 * good-but-rarely-shown candidates.
 */
import { clip100 } from './math';
import { scoreForYou, type ForYouInputs, type Explain as ForYouExplain } from './forYou';
import type { AlgoConsentTag } from './consent';
import { registerAlgo } from './registry';
import { v5FeatureEnabled } from './flags';

export const AI_PICKS_WEIGHTS = {
  forYou: 0.30,
  cf: 0.20,
  active: 0.15,
  serious: 0.10,
  explore: 0.10,
  matchHistoryAffinity: 0.10,
  vibeMomentum: 0.05,
} as const;

/**
 * v5 ensemble — same shape as v4 plus a `returnRate` term that captures
 * "did Priya come back to look at this profile within a session?" — per the
 * master prompt, a strong positive indicator. Weights rebalanced (sum=1.0).
 */
export const AI_PICKS_V5_WEIGHTS = {
  forYou: 0.28,
  cf: 0.18,
  active: 0.14,
  serious: 0.10,
  explore: 0.10,
  matchHistoryAffinity: 0.10,
  vibeMomentum: 0.05,
  returnRate: 0.05,
} as const;

const EXPLORE_EPSILON = 0.10;

export type AiPicksSubScores = {
  cf: number;            // 0..100, from CfNeighbourCache
  active: number;        // 0..100
  serious: number;       // 0..100
  matchHistoryAffinity: number; // 0..100
  vibeMomentum: number;  // 0..100 (last-24h activity slope of candidate)
  /**
   * v5 only — `returnRate` in 0..100. Derived by the caller from
   * `intent.profile.settle` counts on this candidate over the last 7d.
   * Treated as `0` when v5 is off OR when the caller did not supply it.
   */
  returnRate?: number;
};

export type AiPicksInputs = ForYouInputs & {
  subs: AiPicksSubScores;
  rand?: () => number; // injectable for tests
};

export type AiPicksExplain = {
  algo: 'aiPicks';
  consentScope: AlgoConsentTag;
  forYouExplain: ForYouExplain;
  subScores: AiPicksSubScores;
  exploreBoost: number;
  weights: Record<string, number>;
  finalScore: number;
};

export function scoreAiPicksV4(inp: AiPicksInputs): { score: number; explain: AiPicksExplain } {
  const fy = scoreForYou(inp);
  const rand = inp.rand || Math.random;
  const exploreBoost = rand() < EXPLORE_EPSILON ? 100 : 0;

  const raw =
      AI_PICKS_WEIGHTS.forYou * fy.score
    + AI_PICKS_WEIGHTS.cf * inp.subs.cf
    + AI_PICKS_WEIGHTS.active * inp.subs.active
    + AI_PICKS_WEIGHTS.serious * inp.subs.serious
    + AI_PICKS_WEIGHTS.explore * exploreBoost
    + AI_PICKS_WEIGHTS.matchHistoryAffinity * inp.subs.matchHistoryAffinity
    + AI_PICKS_WEIGHTS.vibeMomentum * inp.subs.vibeMomentum;
  const score = clip100(raw);

  return {
    score,
    explain: {
      algo: 'aiPicks', consentScope: inp.consent,
      forYouExplain: fy.explain,
      subScores: inp.subs,
      exploreBoost,
      weights: { ...AI_PICKS_WEIGHTS },
      finalScore: score,
    },
  };
}

/**
 * v5 ensemble — adds a 5% weight on `returnRate` (0..100). All other terms
 * proportionally reduced so the sum is still 1.0. When `subs.returnRate` is
 * undefined, contributes 0 — meaning v5 with no return-rate data degrades
 * gracefully to (approximately) v4.
 */
export function scoreAiPicksV5(inp: AiPicksInputs): { score: number; explain: AiPicksExplain } {
  const fy = scoreForYou(inp);
  const rand = inp.rand || Math.random;
  const exploreBoost = rand() < EXPLORE_EPSILON ? 100 : 0;
  const returnRate = Math.max(0, Math.min(100, inp.subs.returnRate ?? 0));

  const raw =
      AI_PICKS_V5_WEIGHTS.forYou * fy.score
    + AI_PICKS_V5_WEIGHTS.cf * inp.subs.cf
    + AI_PICKS_V5_WEIGHTS.active * inp.subs.active
    + AI_PICKS_V5_WEIGHTS.serious * inp.subs.serious
    + AI_PICKS_V5_WEIGHTS.explore * exploreBoost
    + AI_PICKS_V5_WEIGHTS.matchHistoryAffinity * inp.subs.matchHistoryAffinity
    + AI_PICKS_V5_WEIGHTS.vibeMomentum * inp.subs.vibeMomentum
    + AI_PICKS_V5_WEIGHTS.returnRate * returnRate;
  const score = clip100(raw);

  return {
    score,
    explain: {
      algo: 'aiPicks', consentScope: inp.consent,
      forYouExplain: fy.explain,
      subScores: { ...inp.subs, returnRate },
      exploreBoost,
      weights: { ...AI_PICKS_V5_WEIGHTS },
      finalScore: score,
    },
  };
}

/** Dispatcher — selects v4/v5 based on `ALGO_V5_AI_PICKS_ENABLED`. */
export function scoreAiPicks(inp: AiPicksInputs): { score: number; explain: AiPicksExplain } {
  return v5FeatureEnabled('aiPicks') ? scoreAiPicksV5(inp) : scoreAiPicksV4(inp);
}

registerAlgo({
  name: 'aiPicks',
  surface: 'discover',
  usesEvents: [
    'discover.card_view', 'discover.swipe', 'discover.match',
    'msg.send', 'msg.read', 'profile.view', 'session.start', 'session.heartbeat',
    // v5 — return-rate signal:
    'intent.profile.settle',
  ],
  weights: AI_PICKS_WEIGHTS,
});
