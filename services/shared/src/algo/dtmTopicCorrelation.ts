/**
 * dtmTopicCorrelation \u2014 DTM Phase 16 Pearson correlation between two
 * signed `DtmVector`s (pure).
 *
 * Unlike `dtmTopicPairAffinity` (which works on |component| shares),
 * Pearson correlation is mean-centred and direction-aware: two users who
 * lean opposite on the same topics will score near -1.
 *
 *   correlation \u2208 [-1, 1]
 *   strength    = |correlation|
 *   direction   = +1 / 0 / -1
 */
import { DTM_TOPIC_KEYS } from './dtmTopics';

export type DtmTopicCorrelationResult = {
  correlation: number;
  strength: number;
  direction: -1 | 0 | 1;
};

const N = DTM_TOPIC_KEYS.length;

export function computeDtmTopicCorrelation(
  a: Float32Array | ReadonlyArray<number>,
  b: Float32Array | ReadonlyArray<number>,
): DtmTopicCorrelationResult {
  if (!a || !b || a.length !== N || b.length !== N) {
    return { correlation: 0, strength: 0, direction: 0 };
  }

  let sumA = 0;
  let sumB = 0;
  for (let i = 0; i < N; i++) {
    sumA += Number.isFinite(a[i]) ? a[i] : 0;
    sumB += Number.isFinite(b[i]) ? b[i] : 0;
  }
  const meanA = sumA / N;
  const meanB = sumB / N;

  let cov = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < N; i++) {
    const av = (Number.isFinite(a[i]) ? a[i] : 0) - meanA;
    const bv = (Number.isFinite(b[i]) ? b[i] : 0) - meanB;
    cov += av * bv;
    varA += av * av;
    varB += bv * bv;
  }

  if (varA === 0 || varB === 0) {
    return { correlation: 0, strength: 0, direction: 0 };
  }

  let r = cov / Math.sqrt(varA * varB);
  if (r > 1) r = 1;
  if (r < -1) r = -1;

  const direction: -1 | 0 | 1 = r > 0 ? 1 : r < 0 ? -1 : 0;
  return { correlation: r, strength: Math.abs(r), direction };
}
