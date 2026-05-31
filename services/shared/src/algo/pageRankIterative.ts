export interface PageRankOptions {
  vertexCount: number;
  edges: Array<{ from: number; to: number }>;
  dampingFactor?: number;
  maxIterations?: number;
  tolerance?: number;
  initialRank?: number[];
}

export interface PageRankResult {
  rank: number[];
  iterations: number;
  converged: boolean;
}

export function pageRankIterative(opts: PageRankOptions): PageRankResult {
  const n = opts.vertexCount;
  if (n < 0) throw new RangeError('vertexCount must be >= 0');
  const damping = opts.dampingFactor ?? 0.85;
  if (damping < 0 || damping > 1) throw new RangeError('dampingFactor out of range');
  const maxIter = opts.maxIterations ?? 100;
  if (maxIter < 0) throw new RangeError('maxIterations must be >= 0');
  const tol = opts.tolerance ?? 1e-9;
  if (tol < 0) throw new RangeError('tolerance must be >= 0');
  if (n === 0) return { rank: [], iterations: 0, converged: true };
  for (const e of opts.edges) {
    if (e.from < 0 || e.from >= n || e.to < 0 || e.to >= n) {
      throw new RangeError('edge endpoint out of range');
    }
  }

  const outAdj: number[][] = [];
  for (let i = 0; i < n; i++) outAdj.push([]);
  for (const e of opts.edges) outAdj[e.from].push(e.to);

  const init = opts.initialRank ?? new Array<number>(n).fill(1 / n);
  if (init.length !== n) throw new RangeError('initialRank length mismatch');
  let rank = init.slice();
  const sumInit = rank.reduce((s, x) => s + x, 0);
  if (sumInit <= 0) throw new RangeError('initialRank must sum to > 0');
  rank = rank.map((x) => x / sumInit);

  const baseTerm = (1 - damping) / n;
  let iter = 0;
  let converged = false;
  for (; iter < maxIter; iter++) {
    let danglingSum = 0;
    for (let i = 0; i < n; i++) if (outAdj[i].length === 0) danglingSum += rank[i];
    const next = new Array<number>(n).fill(baseTerm + (damping * danglingSum) / n);
    for (let i = 0; i < n; i++) {
      if (outAdj[i].length === 0) continue;
      const share = (damping * rank[i]) / outAdj[i].length;
      for (const j of outAdj[i]) next[j] += share;
    }
    let diff = 0;
    for (let i = 0; i < n; i++) diff += Math.abs(next[i] - rank[i]);
    rank = next;
    if (diff < tol) {
      iter += 1;
      converged = true;
      break;
    }
  }
  return { rank, iterations: iter, converged };
}
