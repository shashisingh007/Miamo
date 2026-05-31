// HITS algorithm (Kleinberg) — Hub & Authority scores for a directed graph.
// Iterative power method with L2 normalization per step.

export interface HitsGraph {
  nodeCount: number;
  edges: ReadonlyArray<readonly [number, number]>; // directed (u -> v)
}

export interface HitsResult {
  hub: number[];
  authority: number[];
  iterations: number;
}

export interface HitsOptions {
  maxIterations?: number;
  tolerance?: number;
}

export function hitsAlgorithm(graph: HitsGraph, options: HitsOptions = {}): HitsResult {
  if (!graph || !Number.isInteger(graph.nodeCount) || graph.nodeCount < 0) {
    throw new RangeError('graph.nodeCount must be a non-negative integer');
  }
  if (!Array.isArray(graph.edges)) throw new TypeError('graph.edges must be an array');
  const maxIter = options.maxIterations ?? 100;
  const tol = options.tolerance ?? 1e-8;
  if (!Number.isInteger(maxIter) || maxIter <= 0) {
    throw new RangeError('maxIterations must be a positive integer');
  }
  if (!Number.isFinite(tol) || tol <= 0) {
    throw new RangeError('tolerance must be a positive finite number');
  }
  const n = graph.nodeCount;
  if (n === 0) return { hub: [], authority: [], iterations: 0 };
  const inAdj: number[][] = Array.from({ length: n }, () => []);
  const outAdj: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of graph.edges) {
    if (!Number.isInteger(u) || u < 0 || u >= n) throw new RangeError(`bad edge source ${u}`);
    if (!Number.isInteger(v) || v < 0 || v >= n) throw new RangeError(`bad edge target ${v}`);
    outAdj[u].push(v);
    inAdj[v].push(u);
  }
  let hub = new Array<number>(n).fill(1);
  let auth = new Array<number>(n).fill(1);
  let iter = 0;
  for (; iter < maxIter; iter += 1) {
    const newAuth = new Array<number>(n).fill(0);
    for (let v = 0; v < n; v += 1) {
      for (const u of inAdj[v]) newAuth[v] += hub[u];
    }
    const newHub = new Array<number>(n).fill(0);
    for (let u = 0; u < n; u += 1) {
      for (const v of outAdj[u]) newHub[u] += newAuth[v];
    }
    // L2 normalize
    let authNorm = 0;
    let hubNorm = 0;
    for (let i = 0; i < n; i += 1) {
      authNorm += newAuth[i] * newAuth[i];
      hubNorm += newHub[i] * newHub[i];
    }
    authNorm = Math.sqrt(authNorm) || 1;
    hubNorm = Math.sqrt(hubNorm) || 1;
    for (let i = 0; i < n; i += 1) {
      newAuth[i] /= authNorm;
      newHub[i] /= hubNorm;
    }
    let delta = 0;
    for (let i = 0; i < n; i += 1) {
      delta += Math.abs(newAuth[i] - auth[i]) + Math.abs(newHub[i] - hub[i]);
    }
    hub = newHub;
    auth = newAuth;
    if (delta < tol) {
      iter += 1;
      break;
    }
  }
  return { hub, authority: auth, iterations: iter };
}
