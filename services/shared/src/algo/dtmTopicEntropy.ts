/**
 * dtmTopicEntropy \u2014 DTM Phase 16 Shannon entropy of topic distribution (pure).
 *
 * Converts a `DtmVector` into a normalised probability distribution over the
 * 16 topics (share by |component|), then returns Shannon entropy and a
 * convenience normalised entropy in [0,1] (1 = perfectly uniform, 0 = mass
 * concentrated on a single topic).
 */
import { DTM_TOPIC_KEYS } from './dtmTopics';

export type DtmTopicEntropyResult = {
  entropy: number;            // nats: 0 .. ln(N)
  normalized: number;         // 0..1
  effectiveTopics: number;    // exp(entropy)
  activeCount: number;        // topics with share > 0
};

const N = DTM_TOPIC_KEYS.length;
const MAX = Math.log(N);

export function computeDtmTopicEntropy(
  vector: Float32Array | ReadonlyArray<number>,
): DtmTopicEntropyResult {
  if (!vector || vector.length !== N) {
    return { entropy: 0, normalized: 0, effectiveTopics: 1, activeCount: 0 };
  }

  let sum = 0;
  const mags: number[] = new Array(N);
  for (let i = 0; i < N; i++) {
    const v = Number.isFinite(vector[i]) ? Math.abs(vector[i]) : 0;
    mags[i] = v;
    sum += v;
  }

  if (sum === 0) {
    return { entropy: 0, normalized: 0, effectiveTopics: 1, activeCount: 0 };
  }

  let H = 0;
  let active = 0;
  for (let i = 0; i < N; i++) {
    const p = mags[i] / sum;
    if (p > 0) {
      H -= p * Math.log(p);
      active++;
    }
  }
  // Numerical clamp \u2014 H \u2208 [0, ln N]
  if (H < 0) H = 0;
  if (H > MAX) H = MAX;

  return {
    entropy: H,
    normalized: MAX > 0 ? H / MAX : 0,
    effectiveTopics: Math.exp(H),
    activeCount: active,
  };
}
