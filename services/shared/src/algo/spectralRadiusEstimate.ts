// Spectral radius estimate via power iteration.
// Returns an estimate of |λ_max(A)| (modulus of dominant eigenvalue).
// For complex eigenvalues this estimates the largest *real* component absolute value
// via Rayleigh quotient ratio of consecutive iterates.

export interface SpectralRadiusOptions {
  iterations?: number;
  seed?: number;
  tolerance?: number;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function matVec(A: number[][], x: number[]): number[] {
  const n = A.length;
  const y = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const row = A[i];
    let s = 0;
    for (let j = 0; j < x.length; j++) s += row[j] * x[j];
    y[i] = s;
  }
  return y;
}

export function spectralRadiusEstimate(A: number[][], opts: SpectralRadiusOptions = {}): number {
  if (!Array.isArray(A) || A.length === 0) throw new Error('spectralRadiusEstimate: empty');
  const n = A.length;
  for (const row of A) if (row.length !== n) throw new Error('spectralRadiusEstimate: must be square');
  const iterations = opts.iterations ?? 200;
  if (!Number.isInteger(iterations) || iterations <= 0) throw new Error('spectralRadiusEstimate: bad iterations');
  const tol = opts.tolerance ?? 1e-12;
  if (!Number.isFinite(tol) || tol < 0) throw new Error('spectralRadiusEstimate: bad tolerance');

  const rand = mulberry32(opts.seed ?? 1);
  let x = new Array(n);
  for (let i = 0; i < n; i++) x[i] = rand() - 0.5;
  let nrm = Math.sqrt(x.reduce((s, v) => s + v * v, 0));
  if (nrm === 0) {
    x[0] = 1;
    nrm = 1;
  }
  for (let i = 0; i < n; i++) x[i] /= nrm;

  let prev = 0;
  let lambda = 0;
  for (let it = 0; it < iterations; it++) {
    const y = matVec(A, x);
    const ny = Math.sqrt(y.reduce((s, v) => s + v * v, 0));
    if (ny === 0) return 0;
    // Rayleigh quotient (uses unit-norm x): lambda = x^T A x = x^T y
    let rq = 0;
    for (let i = 0; i < n; i++) rq += x[i] * y[i];
    lambda = Math.abs(rq);
    for (let i = 0; i < n; i++) x[i] = y[i] / ny;
    if (it > 0 && Math.abs(lambda - prev) < tol * Math.max(1, lambda)) break;
    prev = lambda;
  }
  return lambda;
}
