// Clenshaw-Curtis quadrature on [-1, 1] using Trefethen's formula.

export interface ClenshawCurtisNodes {
  nodes: number[];
  weights: number[];
}

export function clenshawCurtisNodes(n: number): ClenshawCurtisNodes {
  if (!Number.isInteger(n) || n < 1) throw new Error('clenshawCurtisNodes: n must be positive integer');
  const N = n;
  const theta = new Array(N + 1);
  for (let k = 0; k <= N; k++) theta[k] = (Math.PI * k) / N;
  const x: number[] = theta.map((t: number) => Math.cos(t));
  const w = new Array(N + 1).fill(0);
  if (N % 2 === 0) {
    w[0] = 1 / (N * N - 1);
    w[N] = w[0];
  } else {
    w[0] = 1 / (N * N);
    w[N] = w[0];
  }
  for (let i = 1; i < N; i++) {
    let v = 1;
    if (N % 2 === 0) {
      for (let k = 1; k <= N / 2 - 1; k++) v -= (2 * Math.cos(2 * k * theta[i])) / (4 * k * k - 1);
      v -= Math.cos(N * theta[i]) / (N * N - 1);
    } else {
      for (let k = 1; k <= (N - 1) / 2; k++) v -= (2 * Math.cos(2 * k * theta[i])) / (4 * k * k - 1);
    }
    w[i] = (2 * v) / N;
  }
  const idx = x.map((_: number, k: number) => k).sort((a: number, b: number) => x[a] - x[b]);
  return {
    nodes: idx.map((k: number) => x[k]),
    weights: idx.map((k: number) => w[k]),
  };
}

export function clenshawCurtisQuad(
  f: (x: number) => number,
  a: number,
  b: number,
  n: number,
): number {
  if (typeof f !== 'function') throw new Error('clenshawCurtisQuad: f must be a function');
  if (!Number.isFinite(a) || !Number.isFinite(b))
    throw new Error('clenshawCurtisQuad: bounds must be finite');
  if (a === b) return 0;
  const { nodes, weights } = clenshawCurtisNodes(n);
  const half = (b - a) / 2;
  const mid = (a + b) / 2;
  let sum = 0;
  for (let i = 0; i < nodes.length; i++) sum += weights[i] * f(half * nodes[i] + mid);
  return half * sum;
}
