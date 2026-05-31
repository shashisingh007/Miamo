// Disjoint Set Union (Union-Find) with path compression + union by rank.
// Operations are effectively O(alpha(n)) amortized.

export class DisjointSetUnion {
  private parent: number[];
  private rank: number[];
  private cnt: number;

  constructor(n: number) {
    if (!Number.isInteger(n) || n < 0) throw new Error('DisjointSetUnion: n must be non-negative integer');
    this.parent = new Array<number>(n);
    this.rank = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i += 1) this.parent[i] = i;
    this.cnt = n;
  }

  size(): number {
    return this.parent.length;
  }

  componentCount(): number {
    return this.cnt;
  }

  find(x: number): number {
    if (!Number.isInteger(x) || x < 0 || x >= this.parent.length) {
      throw new Error('DisjointSetUnion.find: out of range');
    }
    let r = x;
    while (this.parent[r] !== r) r = this.parent[r];
    // path compression
    let cur = x;
    while (this.parent[cur] !== r) {
      const next = this.parent[cur];
      this.parent[cur] = r;
      cur = next;
    }
    return r;
  }

  union(a: number, b: number): boolean {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return false;
    if (this.rank[ra] < this.rank[rb]) {
      this.parent[ra] = rb;
    } else if (this.rank[ra] > this.rank[rb]) {
      this.parent[rb] = ra;
    } else {
      this.parent[rb] = ra;
      this.rank[ra] += 1;
    }
    this.cnt -= 1;
    return true;
  }

  connected(a: number, b: number): boolean {
    return this.find(a) === this.find(b);
  }
}

export function disjointSetUnion(n: number): DisjointSetUnion {
  return new DisjointSetUnion(n);
}
