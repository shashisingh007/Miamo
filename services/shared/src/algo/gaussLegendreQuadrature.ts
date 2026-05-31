export interface GaussLegendreNodes {
  nodes: number[];
  weights: number[];
}

function legendreP(n: number, x: number): { value: number; deriv: number } {
  // P_0 = 1, P_1 = x, (k+1) P_{k+1} = (2k+1) x P_k - k P_{k-1}
  let pkm1 = 1;
  let pk = x;
  if (n === 0) return { value: 1, deriv: 0 };
  if (n === 1) return { value: x, deriv: 1 };
  for (let k = 1; k < n; k++) {
    const pkp1 = ((2 * k + 1) * x * pk - k * pkm1) / (k + 1);
    pkm1 = pk;
    pk = pkp1;
  }
  // derivative: P_n'(x) = n*(x*P_n - P_{n-1}) / (x^2 - 1) for x not at +-1
  const denom = x * x - 1;
  const deriv = denom !== 0 ? (n * (x * pk - pkm1)) / denom : (n * (n + 1)) / 2;
  return { value: pk, deriv };
}

export function gaussLegendreNodes(n: number): GaussLegendreNodes {
  if (!Number.isInteger(n) || n < 1) throw new Error('gaussLegendreNodes: n must be positive integer');
  const nodes = new Array(n).fill(0);
  const weights = new Array(n).fill(0);
  for (let i = 1; i <= n; i++) {
    let x = Math.cos((Math.PI * (i - 0.25)) / (n + 0.5));
    for (let it = 0; it < 100; it++) {
      const { value, deriv } = legendreP(n, x);
      const dx = value / deriv;
      x -= dx;
      if (Math.abs(dx) < 1e-15) break;
    }
    const { deriv } = legendreP(n, x);
    nodes[i - 1] = x;
    weights[i - 1] = 2 / ((1 - x * x) * deriv * deriv);
  }
  // sort ascending by node
  const idx = nodes.map((_, k) => k).sort((a, b) => nodes[a] - nodes[b]);
  return {
    nodes: idx.map((k) => nodes[k]),
    weights: idx.map((k) => weights[k]),
  };
}

export function gaussLegendreQuadrature(
  f: (x: number) => number,
  a: number,
  b: number,
  n: number,
): number {
  if (typeof f !== 'function') throw new Error('gaussLegendreQuadrature: f must be a function');
  if (!Number.isFinite(a) || !Number.isFinite(b))
    throw new Error('gaussLegendreQuadrature: bounds must be finite');
  if (a === b) return 0;
  const { nodes, weights } = gaussLegendreNodes(n);
  const half = (b - a) / 2;
  const mid = (a + b) / 2;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += weights[i] * f(half * nodes[i] + mid);
  return half * sum;
}
