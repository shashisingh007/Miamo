// Baum-Welch (forward-backward) HMM parameter re-estimation. Returns updated
// startProb, transitionProb, and emissionProb matrices after `iterations`
// EM passes over the observation sequence. Uses log-space internally where
// helpful but probabilities themselves are kept in linear space with
// per-time normalisation to avoid underflow on short to medium sequences.

export interface BaumWelchHmm {
  states: readonly string[];
  startProb: Record<string, number>;
  transitionProb: Record<string, Record<string, number>>;
  emissionProb: Record<string, Record<string, number>>;
}

export interface BaumWelchResult {
  startProb: Record<string, number>;
  transitionProb: Record<string, Record<string, number>>;
  emissionProb: Record<string, Record<string, number>>;
  iterations: number;
}

function validate(hmm: BaumWelchHmm): void {
  if (!Array.isArray(hmm.states) || hmm.states.length === 0) {
    throw new Error('baumWelchHmm: states must be non-empty');
  }
  for (const s of hmm.states) {
    const start = hmm.startProb[s] ?? 0;
    if (start < 0 || !Number.isFinite(start)) throw new Error('baumWelchHmm: invalid startProb');
  }
}

export function baumWelchHmm(
  observations: readonly string[],
  hmm: BaumWelchHmm,
  iterations = 10,
): BaumWelchResult {
  validate(hmm);
  if (iterations < 0 || !Number.isInteger(iterations)) {
    throw new Error('baumWelchHmm: iterations must be a non-negative integer');
  }
  const states = hmm.states;
  const N = states.length;
  const T = observations.length;

  const start = states.map((s) => hmm.startProb[s] ?? 0);
  const trans: number[][] = states.map((s) => states.map((s2) => hmm.transitionProb[s]?.[s2] ?? 0));
  const emit: Map<string, number>[] = states.map((s) => new Map(Object.entries(hmm.emissionProb[s] ?? {})));

  if (T === 0) {
    return {
      startProb: matToObj1(states, start),
      transitionProb: matToObj2(states, states, trans),
      emissionProb: emitMatToObj(states, emit),
      iterations: 0,
    };
  }

  const obsSymbols = Array.from(new Set(observations));

  for (let it = 0; it < iterations; it += 1) {
    const alpha: number[][] = Array.from({ length: T }, () => new Array<number>(N).fill(0));
    const beta: number[][] = Array.from({ length: T }, () => new Array<number>(N).fill(0));
    const scale = new Array<number>(T).fill(0);

    for (let i = 0; i < N; i += 1) {
      alpha[0][i] = start[i] * (emit[i].get(observations[0]) ?? 0);
      scale[0] += alpha[0][i];
    }
    if (scale[0] === 0) break;
    for (let i = 0; i < N; i += 1) alpha[0][i] /= scale[0];

    for (let t = 1; t < T; t += 1) {
      let s = 0;
      for (let j = 0; j < N; j += 1) {
        let sum = 0;
        for (let i = 0; i < N; i += 1) sum += alpha[t - 1][i] * trans[i][j];
        alpha[t][j] = sum * (emit[j].get(observations[t]) ?? 0);
        s += alpha[t][j];
      }
      scale[t] = s;
      if (s === 0) break;
      for (let j = 0; j < N; j += 1) alpha[t][j] /= s;
    }

    for (let i = 0; i < N; i += 1) beta[T - 1][i] = 1 / (scale[T - 1] || 1);

    for (let t = T - 2; t >= 0; t -= 1) {
      const sc = scale[t] || 1;
      for (let i = 0; i < N; i += 1) {
        let sum = 0;
        for (let j = 0; j < N; j += 1) {
          sum += trans[i][j] * (emit[j].get(observations[t + 1]) ?? 0) * beta[t + 1][j];
        }
        beta[t][i] = sum / sc;
      }
    }

    const newStart = new Array<number>(N).fill(0);
    const newTrans: number[][] = Array.from({ length: N }, () => new Array<number>(N).fill(0));
    const newEmitNum = new Array<Map<string, number>>(N);
    for (let i = 0; i < N; i += 1) newEmitNum[i] = new Map(obsSymbols.map((o) => [o, 0] as [string, number]));
    const gammaSum = new Array<number>(N).fill(0);
    const gammaSumExceptLast = new Array<number>(N).fill(0);

    for (let t = 0; t < T; t += 1) {
      let denom = 0;
      const gamma = new Array<number>(N).fill(0);
      for (let i = 0; i < N; i += 1) {
        gamma[i] = alpha[t][i] * beta[t][i];
        denom += gamma[i];
      }
      if (denom === 0) continue;
      for (let i = 0; i < N; i += 1) {
        const g = gamma[i] / denom;
        if (t === 0) newStart[i] = g;
        gammaSum[i] += g;
        if (t < T - 1) gammaSumExceptLast[i] += g;
        const m = newEmitNum[i];
        m.set(observations[t], (m.get(observations[t]) ?? 0) + g);
      }
      if (t < T - 1) {
        let xiDenom = 0;
        const xi: number[][] = Array.from({ length: N }, () => new Array<number>(N).fill(0));
        for (let i = 0; i < N; i += 1) {
          for (let j = 0; j < N; j += 1) {
            xi[i][j] = alpha[t][i] * trans[i][j] * (emit[j].get(observations[t + 1]) ?? 0) * beta[t + 1][j];
            xiDenom += xi[i][j];
          }
        }
        if (xiDenom > 0) {
          for (let i = 0; i < N; i += 1) for (let j = 0; j < N; j += 1) newTrans[i][j] += xi[i][j] / xiDenom;
        }
      }
    }

    for (let i = 0; i < N; i += 1) {
      start[i] = newStart[i];
      const d = gammaSumExceptLast[i];
      for (let j = 0; j < N; j += 1) trans[i][j] = d > 0 ? newTrans[i][j] / d : trans[i][j];
      const eDenom = gammaSum[i];
      if (eDenom > 0) {
        const m = new Map<string, number>();
        for (const o of obsSymbols) m.set(o, (newEmitNum[i].get(o) ?? 0) / eDenom);
        emit[i] = m;
      }
    }
  }

  return {
    startProb: matToObj1(states, start),
    transitionProb: matToObj2(states, states, trans),
    emissionProb: emitMatToObj(states, emit),
    iterations,
  };
}

function matToObj1(keys: readonly string[], vals: number[]): Record<string, number> {
  const out: Record<string, number> = {};
  keys.forEach((k, i) => { out[k] = vals[i]; });
  return out;
}

function matToObj2(rows: readonly string[], cols: readonly string[], m: number[][]): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  rows.forEach((r, i) => {
    const row: Record<string, number> = {};
    cols.forEach((c, j) => { row[c] = m[i][j]; });
    out[r] = row;
  });
  return out;
}

function emitMatToObj(states: readonly string[], emit: Map<string, number>[]): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  states.forEach((s, i) => {
    const row: Record<string, number> = {};
    for (const [k, v] of emit[i]) row[k] = v;
    out[s] = row;
  });
  return out;
}
