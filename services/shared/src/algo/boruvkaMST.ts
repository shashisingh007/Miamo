// Borůvka's Minimum Spanning Tree.
// Each round: every component picks its cheapest outgoing edge; union them.
// O(E log V) in the worst case.

export interface BoruvkaEdge {
  u: number;
  v: number;
  weight: number;
}

export interface BoruvkaResult {
  edges: BoruvkaEdge[];
  totalWeight: number;
}

class DSU {
  parent: number[];
  rank: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
  }
  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }
  union(a: number, b: number): boolean {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return false;
    if (this.rank[ra] < this.rank[rb]) this.parent[ra] = rb;
    else if (this.rank[ra] > this.rank[rb]) this.parent[rb] = ra;
    else {
      this.parent[rb] = ra;
      this.rank[ra] += 1;
    }
    return true;
  }
}

export function boruvkaMST(vertices: number, edges: BoruvkaEdge[]): BoruvkaResult {
  if (!Number.isInteger(vertices) || vertices <= 0) {
    throw new RangeError('vertices must be a positive integer');
  }
  for (const e of edges) {
    if (
      !Number.isInteger(e.u) ||
      !Number.isInteger(e.v) ||
      e.u < 0 ||
      e.v < 0 ||
      e.u >= vertices ||
      e.v >= vertices
    ) {
      throw new RangeError('invalid edge endpoint');
    }
    if (!Number.isFinite(e.weight)) throw new TypeError('edge weight must be finite');
  }
  const dsu = new DSU(vertices);
  const chosenSet = new Set<number>();
  let components = vertices;
  while (components > 1) {
    const cheapest = new Map<number, number>(); // component root -> edge index
    let progress = false;
    for (let i = 0; i < edges.length; i += 1) {
      const e = edges[i];
      const ru = dsu.find(e.u);
      const rv = dsu.find(e.v);
      if (ru === rv) continue;
      const a = cheapest.get(ru);
      if (a === undefined || edges[a].weight > e.weight) {
        cheapest.set(ru, i);
      }
      const b = cheapest.get(rv);
      if (b === undefined || edges[b].weight > e.weight) {
        cheapest.set(rv, i);
      }
    }
    for (const idx of cheapest.values()) {
      const e = edges[idx];
      if (dsu.union(e.u, e.v)) {
        chosenSet.add(idx);
        components -= 1;
        progress = true;
      }
    }
    if (!progress) break; // disconnected
  }
  const mst: BoruvkaEdge[] = [];
  let total = 0;
  for (const idx of chosenSet) {
    mst.push(edges[idx]);
    total += edges[idx].weight;
  }
  mst.sort((a, b) => a.weight - b.weight);
  return { edges: mst, totalWeight: total };
}
