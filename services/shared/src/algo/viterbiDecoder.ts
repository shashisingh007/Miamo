// Viterbi algorithm: most likely state sequence given observations.
// Uses log probabilities to avoid underflow.

export interface ViterbiHmm {
  states: readonly string[];
  startProb: Record<string, number>;
  transitionProb: Record<string, Record<string, number>>;
  emissionProb: Record<string, Record<string, number>>;
}

export interface ViterbiResult {
  path: string[];
  logProb: number;
}

const NEG_INF = -Infinity;

function safeLog(p: number): number {
  if (!Number.isFinite(p) || p < 0) throw new Error('viterbiDecoder: probabilities must be finite and >= 0');
  return p === 0 ? NEG_INF : Math.log(p);
}

export function viterbiDecoder(observations: readonly string[], hmm: ViterbiHmm): ViterbiResult {
  if (!Array.isArray(hmm.states) || hmm.states.length === 0) {
    throw new Error('viterbiDecoder: states must be non-empty');
  }
  const T = observations.length;
  if (T === 0) return { path: [], logProb: 0 };
  const states = hmm.states;
  const N = states.length;

  const v: number[][] = Array.from({ length: T }, () => new Array(N).fill(NEG_INF));
  const back: number[][] = Array.from({ length: T }, () => new Array(N).fill(-1));

  const o0 = observations[0];
  for (let s = 0; s < N; s += 1) {
    const st = states[s];
    const pi = safeLog(hmm.startProb[st] ?? 0);
    const e = safeLog(hmm.emissionProb[st]?.[o0] ?? 0);
    v[0][s] = pi + e;
  }

  for (let t = 1; t < T; t += 1) {
    const ot = observations[t];
    for (let s = 0; s < N; s += 1) {
      const st = states[s];
      const e = safeLog(hmm.emissionProb[st]?.[ot] ?? 0);
      let best = NEG_INF;
      let bestPrev = -1;
      for (let p = 0; p < N; p += 1) {
        const prev = states[p];
        const tr = safeLog(hmm.transitionProb[prev]?.[st] ?? 0);
        const cand = v[t - 1][p] + tr + e;
        if (cand > best) {
          best = cand;
          bestPrev = p;
        }
      }
      v[t][s] = best;
      back[t][s] = bestPrev;
    }
  }

  let bestEnd = 0;
  let bestEndVal = v[T - 1][0];
  for (let s = 1; s < N; s += 1) {
    if (v[T - 1][s] > bestEndVal) {
      bestEndVal = v[T - 1][s];
      bestEnd = s;
    }
  }

  const path: string[] = new Array(T);
  path[T - 1] = states[bestEnd];
  let cur = bestEnd;
  for (let t = T - 1; t > 0; t -= 1) {
    cur = back[t][cur];
    path[t - 1] = states[cur];
  }
  return { path, logProb: bestEndVal };
}
