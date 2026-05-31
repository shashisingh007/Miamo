// Union-Find (Disjoint Set) with path compression + union by rank/size.

export class UnionFindDisjointSet {
  private readonly parent: number[];
  private readonly rank: Uint32Array;
  private readonly sizes: Uint32Array;
  private componentsCount: number;

  constructor(n: number) {
    if (!Number.isInteger(n) || n < 0) throw new Error('size must be a non-negative integer');
    this.parent = new Array(n);
    this.rank = new Uint32Array(n);
    this.sizes = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
      this.parent[i] = i;
      this.sizes[i] = 1;
    }
    this.componentsCount = n;
  }

  get size(): number {
    return this.parent.length;
  }

  get components(): number {
    return this.componentsCount;
  }

  private check(i: number): void {
    if (!Number.isInteger(i) || i < 0 || i >= this.parent.length) {
      throw new RangeError(`index ${i} out of bounds`);
    }
  }

  find(i: number): number {
    this.check(i);
    let root = i;
    while (this.parent[root] !== root) root = this.parent[root];
    let cur = i;
    while (this.parent[cur] !== root) {
      const next = this.parent[cur];
      this.parent[cur] = root;
      cur = next;
    }
    return root;
  }

  connected(a: number, b: number): boolean {
    return this.find(a) === this.find(b);
  }

  union(a: number, b: number): boolean {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return false;
    let lo = ra;
    let hi = rb;
    if (this.rank[lo] < this.rank[hi]) {
      const tmp = lo;
      lo = hi;
      hi = tmp;
    }
    // lo has rank >= hi
    this.parent[hi] = lo;
    this.sizes[lo] += this.sizes[hi];
    if (this.rank[lo] === this.rank[hi]) this.rank[lo]++;
    this.componentsCount--;
    return true;
  }

  componentSize(i: number): number {
    return this.sizes[this.find(i)];
  }
}
