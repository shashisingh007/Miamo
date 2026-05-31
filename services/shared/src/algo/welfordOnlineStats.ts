export interface WelfordState {
  n: number;
  mean: number;
  m2: number;
}

export function welfordInit(): WelfordState {
  return { n: 0, mean: 0, m2: 0 };
}

export function welfordUpdate(state: WelfordState, x: number): WelfordState {
  if (!Number.isFinite(x)) {
    throw new Error('welfordUpdate: non-finite value');
  }
  const n = state.n + 1;
  const delta = x - state.mean;
  const mean = state.mean + delta / n;
  const delta2 = x - mean;
  const m2 = state.m2 + delta * delta2;
  return { n, mean, m2 };
}

export function welfordVariance(state: WelfordState): number {
  return state.n < 2 ? 0 : state.m2 / (state.n - 1);
}

export function welfordPopulationVariance(state: WelfordState): number {
  return state.n < 1 ? 0 : state.m2 / state.n;
}

export function welfordOnlineStats(values: Iterable<number>): {
  n: number;
  mean: number;
  variance: number;
  populationVariance: number;
  stddev: number;
} {
  let state = welfordInit();
  for (const v of values) state = welfordUpdate(state, v);
  const variance = welfordVariance(state);
  return {
    n: state.n,
    mean: state.mean,
    variance,
    populationVariance: welfordPopulationVariance(state),
    stddev: Math.sqrt(variance),
  };
}
