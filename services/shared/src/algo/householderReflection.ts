export interface HouseholderResult {
  v: number[];
  beta: number;
}

export function householderReflection(x: number[]): HouseholderResult {
  if (x.length === 0) throw new Error('householderReflection: empty x');
  for (const v of x) if (!Number.isFinite(v)) throw new Error('householderReflection: non-finite');
  const n = x.length;
  const sigma = x.slice(1).reduce((s, v) => s + v * v, 0);
  const v = x.slice();
  if (sigma === 0 && x[0] >= 0) {
    v[0] = 1;
    return { v, beta: 0 };
  }
  const mu = Math.sqrt(x[0] * x[0] + sigma);
  if (x[0] <= 0) {
    v[0] = x[0] - mu;
  } else {
    v[0] = -sigma / (x[0] + mu);
  }
  const v0sq = v[0] * v[0];
  const beta = (2 * v0sq) / (sigma + v0sq);
  const denom = v[0];
  for (let i = 0; i < n; i++) v[i] /= denom;
  return { v, beta };
}

export function applyHouseholderLeft(A: number[][], v: number[], beta: number): number[][] {
  const m = A.length;
  if (m === 0) return A;
  const cols = A[0].length;
  if (v.length !== m) throw new Error('applyHouseholderLeft: v size mismatch');
  if (!(beta >= 0)) throw new Error('applyHouseholderLeft: beta>=0');
  const out = A.map((r) => r.slice());
  for (let j = 0; j < cols; j++) {
    let s = 0;
    for (let i = 0; i < m; i++) s += v[i] * out[i][j];
    s *= beta;
    for (let i = 0; i < m; i++) out[i][j] -= s * v[i];
  }
  return out;
}
