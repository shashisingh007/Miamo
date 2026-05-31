export interface KruskalEdge {
  from: number;
  to: number;
  weight: number;
}

export interface KruskalResult {
  mst: KruskalEdge[];
  totalWeight: number;
  connected: boolean;
}

class DSU {
  parent: number[];
  rank: number[];
  components: number;
  constructor(n: number) {
    this.parent = new Array(n);
    this.rank = new Array(n).fill(0);
    this.components = n;
    for (let i = 0; i < n; i++) this.parent[i] = i;
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
    else { this.parent[rb] = ra; this.rank[ra] += 1; }
    this.components -= 1;
    return true;
  }
}

export function kruskalMST(nodeCount: number, edges: KruskalEdge[]): KruskalResult {
  if (nodeCount <= 0) throw new RangeError('nodeCount must be positive');
  for (const e of edges) {
    if (e.from < 0 || e.from >= nodeCount || e.to < 0 || e.to >= nodeCount) {
      throw new RangeError('edge endpoint out of bounds');
    }
  }
  const sorted = [...edges].sort((a, b) => a.weight - b.weight);
  const dsu = new DSU(nodeCount);
  const mst: KruskalEdge[] = [];
  let total = 0;
  for (const e of sorted) {
    if (dsu.union(e.from, e.to)) {
      mst.push(e);
      total += e.weight;
      if (mst.length === nodeCount - 1) break;
    }
  }
  return { mst, totalWeight: total, connected: dsu.components === 1 };
}
