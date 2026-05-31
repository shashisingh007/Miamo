// Welsh-Powell greedy graph coloring: sort vertices by descending degree,
// then color each vertex with the smallest color not used by its neighbors.
// Guarantees at most max-degree + 1 colors; often much fewer.

export interface ColoringGraph {
  nodeCount: number;
  edges: ReadonlyArray<readonly [number, number]>; // undirected; (u,v) and (v,u) treated equivalently
}

export interface ColoringResult {
  colors: number[]; // colors[i] is 0..k-1
  colorCount: number;
}

export function welshPowellColoring(graph: ColoringGraph): ColoringResult {
  if (!graph || !Number.isInteger(graph.nodeCount) || graph.nodeCount < 0) {
    throw new RangeError('graph.nodeCount must be a non-negative integer');
  }
  if (!Array.isArray(graph.edges)) throw new TypeError('graph.edges must be an array');
  const n = graph.nodeCount;
  if (n === 0) return { colors: [], colorCount: 0 };
  const adj: Set<number>[] = Array.from({ length: n }, () => new Set<number>());
  for (const [u, v] of graph.edges) {
    if (!Number.isInteger(u) || u < 0 || u >= n) throw new RangeError(`bad endpoint ${u}`);
    if (!Number.isInteger(v) || v < 0 || v >= n) throw new RangeError(`bad endpoint ${v}`);
    if (u === v) continue; // ignore self-loops
    adj[u].add(v);
    adj[v].add(u);
  }
  const order = Array.from({ length: n }, (_, i) => i);
  order.sort((a, b) => adj[b].size - adj[a].size || a - b);
  const colors = new Array<number>(n).fill(-1);
  let used = 0;
  for (const v of order) {
    const neighborColors = new Set<number>();
    for (const u of adj[v]) if (colors[u] !== -1) neighborColors.add(colors[u]);
    let c = 0;
    while (neighborColors.has(c)) c += 1;
    colors[v] = c;
    if (c + 1 > used) used = c + 1;
  }
  return { colors, colorCount: used };
}

export function isProperColoring(graph: ColoringGraph, colors: number[]): boolean {
  for (const [u, v] of graph.edges) {
    if (u === v) continue;
    if (colors[u] === colors[v]) return false;
  }
  return true;
}
