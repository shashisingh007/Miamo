export interface BellmanEdge {
  from: number;
  to: number;
  weight: number;
}

export interface BellmanFordResult {
  dist: number[];
  prev: Array<number | null>;
  hasNegativeCycle: boolean;
}

export function bellmanFordShortestPath(
  nodeCount: number,
  edges: BellmanEdge[],
  source: number
): BellmanFordResult {
  if (nodeCount <= 0) throw new RangeError('nodeCount must be positive');
  if (source < 0 || source >= nodeCount) throw new RangeError('source out of bounds');
  for (const e of edges) {
    if (e.from < 0 || e.from >= nodeCount || e.to < 0 || e.to >= nodeCount) {
      throw new RangeError('edge endpoint out of bounds');
    }
  }
  const dist = new Array<number>(nodeCount).fill(Infinity);
  const prev = new Array<number | null>(nodeCount).fill(null);
  dist[source] = 0;
  for (let i = 0; i < nodeCount - 1; i++) {
    let changed = false;
    for (const e of edges) {
      if (dist[e.from] === Infinity) continue;
      const alt = dist[e.from] + e.weight;
      if (alt < dist[e.to]) {
        dist[e.to] = alt;
        prev[e.to] = e.from;
        changed = true;
      }
    }
    if (!changed) break;
  }
  let hasNegativeCycle = false;
  for (const e of edges) {
    if (dist[e.from] === Infinity) continue;
    if (dist[e.from] + e.weight < dist[e.to]) {
      hasNegativeCycle = true;
      break;
    }
  }
  return { dist, prev, hasNegativeCycle };
}
