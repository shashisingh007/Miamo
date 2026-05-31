export interface JohnsonsEdge {
  from: number;
  to: number;
  weight: number;
}

export interface JohnsonsResult {
  distance: number[][];
  hasNegativeCycle: boolean;
}

export function johnsonsAllPairsShortestPath(
  vertexCount: number,
  edges: JohnsonsEdge[],
): JohnsonsResult {
  if (vertexCount < 0) throw new RangeError('vertexCount must be >= 0');
  for (const e of edges) {
    if (e.from < 0 || e.from >= vertexCount || e.to < 0 || e.to >= vertexCount) {
      throw new RangeError('edge endpoint out of range');
    }
  }
  const n = vertexCount;
  if (n === 0) return { distance: [], hasNegativeCycle: false };

  // Bellman-Ford from virtual source (n) to all
  const h = new Array<number>(n + 1).fill(0);
  for (let iter = 0; iter < n; iter++) {
    let changed = false;
    for (const e of edges) {
      if (h[e.from] + e.weight < h[e.to]) {
        h[e.to] = h[e.from] + e.weight;
        changed = true;
      }
    }
    if (!changed) break;
  }
  for (const e of edges) {
    if (h[e.from] + e.weight < h[e.to]) {
      return { distance: [], hasNegativeCycle: true };
    }
  }

  const reweighted: { to: number; w: number }[][] = [];
  for (let i = 0; i < n; i++) reweighted.push([]);
  for (const e of edges) {
    reweighted[e.from].push({ to: e.to, w: e.weight + h[e.from] - h[e.to] });
  }

  const dist: number[][] = [];
  for (let s = 0; s < n; s++) {
    const d = new Array<number>(n).fill(Infinity);
    d[s] = 0;
    const visited = new Array<boolean>(n).fill(false);
    for (let k = 0; k < n; k++) {
      let u = -1;
      let best = Infinity;
      for (let i = 0; i < n; i++) if (!visited[i] && d[i] < best) { best = d[i]; u = i; }
      if (u === -1) break;
      visited[u] = true;
      for (const e of reweighted[u]) {
        const nd = d[u] + e.w;
        if (nd < d[e.to]) d[e.to] = nd;
      }
    }
    const row = new Array<number>(n);
    for (let v = 0; v < n; v++) {
      row[v] = d[v] === Infinity ? Infinity : d[v] - h[s] + h[v];
    }
    dist.push(row);
  }
  return { distance: dist, hasNegativeCycle: false };
}
