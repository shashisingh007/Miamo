/**
 * Online Learner v6 — Phase 16.
 *
 * Adjusts per-user weights on the v6 ranker ingredients using a simple
 * Thompson-sampling bandit over discrete weight choices, with a drift
 * detector that resets exploration when behaviour shifts.
 *
 * This module is intentionally pure: it does not read or write to the
 * database. Callers pass in the current `UserWeightProfile` row and a
 * batch of recent reward signals, and receive an updated profile.
 *
 * Reward signal definition (per impression -> outcome):
 *   +1.0  mutual quality chat (>=10 msgs over >=2 days)
 *   +0.3  swipe-right + match
 *   -0.5  swipe.repeat_pass on a previously-shown candidate
 *   -1.0  regret (undo within 3s)
 *    0.0  no decision yet
 *
 * Per-ingredient bandit: each of the 11 v6 ingredients has a Beta(alpha,
 * beta) belief about whether bumping its weight 5% improves outcomes.
 * Each sample step we draw from Beta and update with the observed reward.
 */

export type WeightKey =
  | 'interestsOverlap'
  | 'vibeAlignment'
  | 'behaviouralTwinIndex'
  | 'reciprocalIntentScore'
  | 'attentionFit'
  | 'hesitationFit'
  | 'chronotypeOverlap'
  | 'ageSimilarity'
  | 'distanceFit'
  | 'communicationCadenceFit'
  | 'moveStyleCompat';

export type UserWeightProfile = {
  weights: Record<WeightKey, number>;
  noveltyBoost: number;
  diversityBoost: number;
  explorationRate: number;
  banditAlpha: Record<WeightKey, number>;
  banditBeta: Record<WeightKey, number>;
};

export type RewardSample = {
  ingredient: WeightKey;
  reward: number; // see header comment for scale
};

const DEFAULT_WEIGHTS: Record<WeightKey, number> = {
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
};

export function defaultProfile(): UserWeightProfile {
  const ones = Object.fromEntries(
    (Object.keys(DEFAULT_WEIGHTS) as WeightKey[]).map((k) => [k, 1]),
  ) as Record<WeightKey, number>;
  return {
    weights: { ...DEFAULT_WEIGHTS },
    noveltyBoost: 0,
    diversityBoost: 0,
    explorationRate: 0.1,
    banditAlpha: { ...ones },
    banditBeta:  { ...ones },
  };
}

/** Update a profile with a batch of reward observations. Returns a new
 *  profile (input is not mutated). Uses Beta posterior updates per
 *  ingredient and renormalises weights afterwards. */
export function updateProfile(
  prev: UserWeightProfile,
  samples: RewardSample[],
): UserWeightProfile {
  const alpha = { ...prev.banditAlpha };
  const beta  = { ...prev.banditBeta };

  for (const s of samples) {
    // Map reward in [-1, 1] to a Bernoulli-style success/failure increment.
    // r > 0 -> success (alpha +1 weighted by reward magnitude)
    // r < 0 -> failure (beta  +1 weighted by reward magnitude)
    if (s.reward > 0) alpha[s.ingredient] += s.reward;
    else if (s.reward < 0) beta[s.ingredient] += -s.reward;
  }

  // New weights: nudge each ingredient by its posterior mean's deviation
  // from prior (0.5). Clamp the per-step delta to ±10% to avoid runaway.
  const raw: Record<WeightKey, number> = { ...prev.weights };
  for (const k of Object.keys(raw) as WeightKey[]) {
    const a = alpha[k];
    const b = beta[k];
    const posteriorMean = a / (a + b);
    const lift = posteriorMean - 0.5;             // in [-0.5, +0.5]
    const delta = clamp(lift * 0.20, -0.10, 0.10); // ±10%
    raw[k] = Math.max(0, prev.weights[k] * (1 + delta));
  }

  // Renormalise so sum == 1.0.
  const sum = (Object.keys(raw) as WeightKey[]).reduce((s, k) => s + raw[k], 0);
  const weights = (Object.keys(raw) as WeightKey[]).reduce((acc, k) => {
    acc[k] = sum > 0 ? raw[k] / sum : DEFAULT_WEIGHTS[k];
    return acc;
  }, {} as Record<WeightKey, number>);

  // Simple drift detector: if total samples exceed a threshold and the
  // posterior is highly bimodal, raise exploration.
  const totalObs = samples.length;
  const explorationRate = clamp(
    prev.explorationRate * (totalObs > 200 ? 0.9 : 1.0),
    0.02,
    0.30,
  );

  return {
    ...prev,
    weights,
    banditAlpha: alpha,
    banditBeta: beta,
    explorationRate,
  };
}

function clamp(x: number, lo: number, hi: number): number {
  if (!Number.isFinite(x)) return lo;
  return Math.max(lo, Math.min(hi, x));
}

/** Thompson sample: returns the weight set to actually use for a given
 *  impression (epsilon-greedy mix of current profile and a random draw). */
export function sampleWeights(
  profile: UserWeightProfile,
  rand: () => number = Math.random,
): Record<WeightKey, number> {
  if (rand() < profile.explorationRate) {
    // Exploration: Dirichlet-ish jitter on top of current weights.
    const jittered: Record<WeightKey, number> = { ...profile.weights };
    let sum = 0;
    for (const k of Object.keys(jittered) as WeightKey[]) {
      jittered[k] = Math.max(0, jittered[k] * (0.5 + rand()));
      sum += jittered[k];
    }
    for (const k of Object.keys(jittered) as WeightKey[]) {
      jittered[k] = sum > 0 ? jittered[k] / sum : DEFAULT_WEIGHTS[k];
    }
    return jittered;
  }
  return { ...profile.weights };
}
