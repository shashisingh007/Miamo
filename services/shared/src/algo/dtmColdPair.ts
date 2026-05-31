/**
 * dtmColdPair \u2014 DTM Phase 11 cold-pair handler (pure).
 *
 * When one or both users haven't answered enough DTM questions, the
 * compat score derived from their vectors is meaningless and should not
 * be shown with full confidence. This helper returns a blended score
 * and a clear cold-state flag for the UI.
 *
 *   coverage_i = answered_i / minAnswers   (clamped to [0, 1])
 *   pair_cov   = min(coverage_me, coverage_cand)
 *   final      = raw * pair_cov + neutral * (1 - pair_cov)
 *
 * `state`:
 *   - 'cold'   when pair_cov < 0.25
 *   - 'warm'   when 0.25 \u2264 pair_cov < 0.75
 *   - 'ready'  when pair_cov \u2265 0.75
 */
export type DtmColdPairInputs = {
  rawScore: number;          // \u22121..+1 typical, will be clamped
  meAnswered: number;
  candAnswered: number;
  minAnswers?: number;       // default 12
  neutralScore?: number;     // default 0.5
};

export type DtmColdPairState = 'cold' | 'warm' | 'ready';

export type DtmColdPairResult = {
  score: number;             // 0..1 blended
  pairCoverage: number;      // 0..1
  state: DtmColdPairState;
  showConfidence: boolean;   // false when cold
};

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

export function resolveDtmColdPair(inp: DtmColdPairInputs): DtmColdPairResult {
  const minA = Math.max(1, inp.minAnswers ?? 12);
  const neutral = clamp01(inp.neutralScore ?? 0.5);
  const covMe = clamp01((inp.meAnswered ?? 0) / minA);
  const covCa = clamp01((inp.candAnswered ?? 0) / minA);
  const pair = Math.min(covMe, covCa);
  const raw = clamp01(inp.rawScore);
  const score = raw * pair + neutral * (1 - pair);
  const state: DtmColdPairState = pair < 0.25 ? 'cold' : pair < 0.75 ? 'warm' : 'ready';
  return { score, pairCoverage: pair, state, showConfidence: state !== 'cold' };
}
