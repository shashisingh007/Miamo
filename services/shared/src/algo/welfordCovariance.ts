export interface WelfordCovState {
  n: number;
  meanX: number;
  meanY: number;
  c: number;
  m2x: number;
  m2y: number;
}

export function createWelfordCov(): WelfordCovState {
  return { n: 0, meanX: 0, meanY: 0, c: 0, m2x: 0, m2y: 0 };
}

export function updateWelfordCov(state: WelfordCovState, x: number, y: number): WelfordCovState {
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('welfordCov: non-finite');
  const n = state.n + 1;
  const dx = x - state.meanX;
  const dy = y - state.meanY;
  const meanX = state.meanX + dx / n;
  const meanY = state.meanY + dy / n;
  const c = state.c + dx * (y - meanY);
  const m2x = state.m2x + dx * (x - meanX);
  const m2y = state.m2y + dy * (y - meanY);
  return { n, meanX, meanY, c, m2x, m2y };
}

export function welfordCovariance(state: WelfordCovState, sample = true): number {
  if (state.n < 2) throw new Error('welfordCov: need at least 2 samples');
  return state.c / (sample ? state.n - 1 : state.n);
}

export function welfordVarianceX(state: WelfordCovState, sample = true): number {
  if (state.n < 2) throw new Error('welfordCov: need at least 2 samples');
  return state.m2x / (sample ? state.n - 1 : state.n);
}

export function welfordVarianceY(state: WelfordCovState, sample = true): number {
  if (state.n < 2) throw new Error('welfordCov: need at least 2 samples');
  return state.m2y / (sample ? state.n - 1 : state.n);
}

export function welfordCorrelation(state: WelfordCovState): number {
  if (state.n < 2) throw new Error('welfordCov: need at least 2 samples');
  const denom = Math.sqrt(state.m2x * state.m2y);
  if (denom === 0) throw new Error('welfordCov: zero variance');
  return state.c / denom;
}
