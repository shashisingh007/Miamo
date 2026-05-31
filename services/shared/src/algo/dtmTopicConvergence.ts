/**
 * dtmTopicConvergence \u2014 DTM Phase 16 vector convergence measure (pure).
 *
 * Given a sequence of historical `DtmVector` snapshots (oldest -> newest),
 * computes how stable the recent profile is. Convergence near 1 means the
 * user's profile barely changes between snapshots; near 0 means it churns.
 *
 *   convergence = avg cosine of consecutive snapshot pairs in the
 *                 most recent `windowSize` snapshots
 */
import { DTM_TOPIC_KEYS } from './dtmTopics';

export type DtmConvergenceResult = {
  convergence: number;   // 0..1
  pairsCompared: number;
  drift: number;         // 1 - convergence (convenience)
};

function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let s = 0;
  const N = DTM_TOPIC_KEYS.length;
  for (let i = 0; i < N; i++) {
    const av = Number.isFinite(a[i]) ? a[i] : 0;
    const bv = Number.isFinite(b[i]) ? b[i] : 0;
    s += av * bv;
  }
  return s;
}

function l2(a: ArrayLike<number>): number {
  let s = 0;
  const N = DTM_TOPIC_KEYS.length;
  for (let i = 0; i < N; i++) {
    const v = Number.isFinite(a[i]) ? a[i] : 0;
    s += v * v;
  }
  return Math.sqrt(s);
}

export function computeDtmTopicConvergence(
  snapshots: ReadonlyArray<Float32Array | ReadonlyArray<number>>,
  windowSize = 5,
): DtmConvergenceResult {
  const N = DTM_TOPIC_KEYS.length;
  const valid = snapshots.filter((s) => s && s.length === N);
  if (valid.length < 2) return { convergence: 1, pairsCompared: 0, drift: 0 };

  const win = Math.max(2, windowSize | 0);
  const slice = valid.slice(-win);
  let sum = 0;
  let pairs = 0;
  for (let i = 1; i < slice.length; i++) {
    const a = slice[i - 1];
    const b = slice[i];
    const na = l2(a);
    const nb = l2(b);
    if (na === 0 || nb === 0) continue;
    const cos = dot(a, b) / (na * nb);
    // clamp tiny FP excess into [-1,1]
    const c = cos > 1 ? 1 : cos < -1 ? -1 : cos;
    sum += (c + 1) / 2; // map [-1,1] -> [0,1]
    pairs++;
  }
  const convergence = pairs > 0 ? sum / pairs : 1;
  return { convergence, pairsCompared: pairs, drift: 1 - convergence };
}
