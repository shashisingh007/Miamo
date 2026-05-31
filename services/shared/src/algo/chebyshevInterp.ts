// Chebyshev interpolation via barycentric Lagrange at Chebyshev-Lobatto nodes.
// Given f sampled at n+1 nodes on [a,b], returns an evaluator on [a,b].

export interface ChebyshevInterpolant {
  nodes: number[];
  values: number[];
  evaluate: (x: number) => number;
}

export function chebyshevInterp(
  f: (x: number) => number,
  n: number,
  a: number,
  b: number,
): ChebyshevInterpolant {
  if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error('non-finite interval');
  if (!(a < b)) throw new Error('require a < b');
  if (!Number.isInteger(n) || n < 1) throw new Error('degree must be a positive integer');

  const N = n; // number of intervals; nodes count = N+1
  const nodes: number[] = new Array(N + 1);
  const values: number[] = new Array(N + 1);
  const mid = (a + b) / 2;
  const half = (b - a) / 2;
  for (let k = 0; k <= N; k++) {
    const x = mid + half * Math.cos((Math.PI * k) / N);
    nodes[k] = x;
    values[k] = f(x);
  }

  // Barycentric weights for Chebyshev-Lobatto: w_k = (-1)^k * c_k, c_0=c_N=0.5, else 1.
  const weights: number[] = new Array(N + 1);
  for (let k = 0; k <= N; k++) {
    const c = k === 0 || k === N ? 0.5 : 1;
    weights[k] = (k % 2 === 0 ? 1 : -1) * c;
  }

  const evaluate = (x: number): number => {
    if (!Number.isFinite(x)) throw new Error('non-finite x');
    let num = 0;
    let den = 0;
    for (let k = 0; k <= N; k++) {
      const diff = x - nodes[k];
      if (diff === 0) return values[k];
      const t = weights[k] / diff;
      num += t * values[k];
      den += t;
    }
    return num / den;
  };

  return { nodes, values, evaluate };
}
