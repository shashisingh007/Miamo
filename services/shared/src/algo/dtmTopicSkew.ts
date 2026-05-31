/**
 * dtmTopicSkew \u2014 DTM Phase 16 distribution-skew metrics (pure).
 *
 * Treats the `DtmVector` as a topic-share distribution (|component| /
 * \u03a3|components|) and returns concentration metrics: top-share, top-3 share,
 * Herfindahl\u2013Hirschman Index, Gini coefficient. Useful for detecting
 * "all-eggs-in-one-basket" profiles vs balanced ones.
 *
 *   topShare    = max share                      \u2208 [0,1]
 *   top3Share   = sum of top-3 shares            \u2208 [0,1]
 *   hhi         = \u03a3 share^2                      \u2208 [1/N, 1]
 *   gini        = standard discrete Gini         \u2208 [0,1]  (0=uniform)
 */
import { DTM_TOPIC_KEYS } from './dtmTopics';

export type DtmTopicSkewResult = {
  topShare: number;
  top3Share: number;
  hhi: number;
  gini: number;
};

const N = DTM_TOPIC_KEYS.length;

export function computeDtmTopicSkew(
  vector: Float32Array | ReadonlyArray<number>,
): DtmTopicSkewResult {
  if (!vector || vector.length !== N) {
    return { topShare: 0, top3Share: 0, hhi: 0, gini: 0 };
  }
  const mags = new Array<number>(N);
  let sum = 0;
  for (let i = 0; i < N; i++) {
    const m = Number.isFinite(vector[i]) ? Math.abs(vector[i]) : 0;
    mags[i] = m;
    sum += m;
  }
  if (sum === 0) return { topShare: 0, top3Share: 0, hhi: 0, gini: 0 };

  const shares = mags.map((m) => m / sum).sort((a, b) => b - a);
  const topShare = shares[0];
  const top3Share = shares[0] + (shares[1] ?? 0) + (shares[2] ?? 0);

  let hhi = 0;
  for (const s of shares) hhi += s * s;

  // Gini: sort ascending then \u03a3 (2i - n - 1) * x_i / (n * \u03a3 x_i)
  // \u03a3 x_i == 1 since shares sum to 1.
  const asc = shares.slice().reverse();
  let g = 0;
  for (let i = 0; i < N; i++) {
    g += (2 * (i + 1) - N - 1) * asc[i];
  }
  let gini = g / N;
  if (gini < 0) gini = 0;
  if (gini > 1) gini = 1;

  return { topShare, top3Share: Math.min(1, top3Share), hhi, gini };
}
