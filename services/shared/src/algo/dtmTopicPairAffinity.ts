/**
 * dtmTopicPairAffinity \u2014 DTM Phase 16 pairwise topic affinity (pure).
 *
 * Given two users' `DtmVector` profiles, compute affinity on the topic-share
 * distribution (|component| normalised to a probability). This complements
 * raw cosine because it ignores sign and overall magnitude and focuses on
 * "do these two people care about the same topics".
 *
 *   shareCosine = cos( shareA, shareB ) in [0,1]
 *   overlap     = \u03a3 min(shareA[i], shareB[i])           in [0,1]
 *   jsd         = Jensen\u2013Shannon divergence (base 2)     in [0,1]
 */
import { DTM_TOPIC_KEYS } from './dtmTopics';

export type DtmPairAffinityResult = {
  shareCosine: number;
  overlap: number;
  jsd: number;          // 0 identical, 1 maximally different
};

const N = DTM_TOPIC_KEYS.length;

function shares(v: ArrayLike<number>): number[] {
  const mags = new Array(N);
  let sum = 0;
  for (let i = 0; i < N; i++) {
    const m = Number.isFinite(v[i]) ? Math.abs(v[i]) : 0;
    mags[i] = m;
    sum += m;
  }
  if (sum === 0) return mags.fill(0);
  for (let i = 0; i < N; i++) mags[i] /= sum;
  return mags;
}

function klDiv2(p: number[], q: number[]): number {
  let s = 0;
  for (let i = 0; i < N; i++) {
    if (p[i] > 0 && q[i] > 0) s += p[i] * (Math.log(p[i] / q[i]) / Math.LN2);
  }
  return s;
}

export function computeDtmTopicPairAffinity(
  a: Float32Array | ReadonlyArray<number>,
  b: Float32Array | ReadonlyArray<number>,
): DtmPairAffinityResult {
  if (!a || !b || a.length !== N || b.length !== N) {
    return { shareCosine: 0, overlap: 0, jsd: 1 };
  }
  const sa = shares(a);
  const sb = shares(b);
  const aZero = sa.every((x) => x === 0);
  const bZero = sb.every((x) => x === 0);
  if (aZero || bZero) return { shareCosine: 0, overlap: 0, jsd: 1 };

  // cosine on share vectors
  let dot = 0;
  let na = 0;
  let nb = 0;
  let overlap = 0;
  const m = new Array<number>(N);
  for (let i = 0; i < N; i++) {
    dot += sa[i] * sb[i];
    na += sa[i] * sa[i];
    nb += sb[i] * sb[i];
    overlap += Math.min(sa[i], sb[i]);
    m[i] = (sa[i] + sb[i]) / 2;
  }
  const cos = na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb);
  const c = cos > 1 ? 1 : cos < 0 ? 0 : cos;

  // Jensen\u2013Shannon divergence (base 2), in [0,1]
  const jsd = 0.5 * klDiv2(sa, m) + 0.5 * klDiv2(sb, m);
  const j = jsd < 0 ? 0 : jsd > 1 ? 1 : jsd;

  return { shareCosine: c, overlap, jsd: j };
}
