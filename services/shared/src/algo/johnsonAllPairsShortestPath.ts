// Johnson's all-pairs shortest path for sparse weighted directed graphs.
// Add a virtual source s with 0-weight edges to all nodes, run Bellman-Ford
// from s to compute potentials h[v]. Reweight edge (u,v): w'(u,v) = w(u,v) + h[u] - h[v].
// Run Dijkstra from each source using non-negative reweighted edges, then
// recover original distance: d(u,v) = d'(u,v) - h[u] + h[v].

export interface JohnsonEdge {
  from: number;
  to: number;
  weight: number;
}

export interface JohnsonGraph {
  nodeCount: number;
  edges: ReadonlyArray<JohnsonEdge>;
}

export interface JohnsonResult {
  distances: number[][]; // distances[u][v]
}

export const JOHNSON_INF = Number.POSITIVE_INFINITY;

class MinHeap {
  private a: { dist: number; node: number }[] = [];
  size(): number { return this.a.length; }
  push(item: { dist: number; node: number }): void {
    this.a.push(item);
    let i = this.a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.a[p].dist <= this.a[i].dist) break;
      [this.a[p], this.a[i]] = [this.a[i], this.a[p]];
      i = p;
    }
  }
  pop(): { dist: number; node: number } | undefined {
    if (this.a.length === 0) return undefined;
    const top = this.a[0];
    const last = this.a.pop()!;
    if (this.a.length > 0) {
      this.a[0] = last;
      let i = 0;
      const n = this.a.length;
      while (true) {
        const l = i * 2 + 1;
        const r = l + 1;
        let s = i;
        if (l < n && this.a[l].dist < this.a[s].dist) s = l;
        if (r < n && this.a[r].dist < this.a[s].dist) s = r;
        if (s === i) break;
        [this.a[i], this.a[s]] = [this.a[s], this.a[i]];
        i = s;
      }
    }
    return top;
  }
}

export function johnsonAllPairsShortestPath(graph: JohnsonGraph): JohnsonResult {
  if (!graph || !Number.isInteger(graph.nodeCount) || graph.nodeCount < 0) {
    throw new RangeError('graph.nodeCount must be a non-negative integer');
  }
  if (!Array.isArray(graph.edges)) throw new TypeError('graph.edges must be an array');
  const n = graph.nodeCount;
  for (const e of graph.edges) {
    if (!Number.isInteger(e.from) || e.from < 0 || e.from >= n) {
      throw new RangeError(`bad edge.from ${e.from}`);
    }
    if (!Number.isInteger(e.to) || e.to < 0 || e.to >= n) {
      throw new RangeError(`bad edge.to ${e.to}`);
    }
    if (!Number.isFinite(e.weight)) throw new RangeError('edge.weight must be finite');
  }

  // Bellman-Ford from virtual source
  const h = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i += 1) {
    let changed = false;
    for (const e of graph.edges) {
      if (h[e.from] + e.weight < h[e.to]) {
        h[e.to] = h[e.from] + e.weight;
        changed = true;
      }
    }
    if (!changed) break;
  }
  // negative cycle check
  for (const e of graph.edges) {
    if (h[e.from] + e.weight < h[e.to]) {
      throw new RangeError('graph contains a negative cycle');
    }
  }

  // build reweighted adjacency
  const adj: { to: number; weight: number }[][] = Array.from({ length: n }, () => []);
  for (const e of graph.edges) {
    adj[e.from].push({ to: e.to, weight: e.weight + h[e.from] - h[e.to] });
  }

  const distances: number[][] = [];
  for (let s = 0; s < n; s += 1) {
    const dist = new Array<number>(n).fill(JOHNSON_INF);
    dist[s] = 0;
    const heap = new MinHeap();
    heap.push({ dist: 0, node: s });
    while (heap.size() > 0) {
      const top = heap.pop()!;
      if (top.dist > dist[top.node]) continue;
      for (const { to, weight } of adj[top.node]) {
        const nd = top.dist + weight;
        if (nd < dist[to]) {
          dist[to] = nd;
          heap.push({ dist: nd, node: to });
        }
      }
    }
    // recover original distance
    const row = new Array<number>(n);
    for (let v = 0; v < n; v += 1) {
      if (dist[v] === JOHNSON_INF) row[v] = JOHNSON_INF;
      else row[v] = dist[v] - h[s] + h[v];
    }
    distances.push(row);
  }
  return { distances };
}
