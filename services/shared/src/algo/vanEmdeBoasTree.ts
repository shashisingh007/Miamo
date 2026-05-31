// Van Emde Boas tree (simplified, recursive). Supports insert / delete / has /
// successor / predecessor / min / max over universe {0, 1, ..., 2^k - 1}.
// All operations are O(log log U).

export class VanEmdeBoasTree {
  private u: number;            // universe size (power of 2)
  private bits: number;         // log2(u)
  private minVal: number | null = null;
  private maxVal: number | null = null;
  private summary: VanEmdeBoasTree | null = null;
  private clusters: Map<number, VanEmdeBoasTree> | null = null;
  private lowerBits: number;
  private upperBits: number;

  constructor(universe: number) {
    if (!Number.isInteger(universe) || universe < 2) {
      throw new Error('VanEmdeBoasTree: universe must be integer >= 2');
    }
    // round up to next power of two
    let bits = 1;
    while ((1 << bits) < universe) bits += 1;
    this.bits = bits;
    this.u = 1 << bits;
    this.upperBits = bits >> 1;
    this.lowerBits = bits - this.upperBits;
    if (bits > 1) {
      this.summary = null;
      this.clusters = new Map();
    }
  }

  private hi(x: number): number {
    return x >>> this.lowerBits;
  }
  private lo(x: number): number {
    return x & ((1 << this.lowerBits) - 1);
  }
  private idx(h: number, l: number): number {
    return (h << this.lowerBits) | l;
  }

  min(): number | null {
    return this.minVal;
  }
  max(): number | null {
    return this.maxVal;
  }

  has(x: number): boolean {
    if (x < 0 || x >= this.u) return false;
    if (this.minVal === x || this.maxVal === x) return true;
    if (this.bits === 1) return false;
    const c = this.clusters!.get(this.hi(x));
    return c ? c.has(this.lo(x)) : false;
  }

  private emptyInsert(x: number): void {
    this.minVal = x;
    this.maxVal = x;
  }

  insert(x: number): void {
    if (!Number.isInteger(x) || x < 0 || x >= this.u) {
      throw new Error('VanEmdeBoasTree.insert: out of universe');
    }
    if (this.minVal === null) {
      this.emptyInsert(x);
      return;
    }
    if (x === this.minVal) return;
    if (x < this.minVal) {
      const tmp = this.minVal;
      this.minVal = x;
      x = tmp;
    }
    if (this.bits > 1) {
      const h = this.hi(x);
      const l = this.lo(x);
      let cluster = this.clusters!.get(h);
      if (!cluster) {
        cluster = new VanEmdeBoasTree(1 << this.lowerBits);
        this.clusters!.set(h, cluster);
      }
      if (cluster.min() === null) {
        if (!this.summary) this.summary = new VanEmdeBoasTree(1 << this.upperBits);
        this.summary.insert(h);
        cluster.emptyInsert(l);
      } else {
        cluster.insert(l);
      }
    }
    if (x > (this.maxVal as number)) this.maxVal = x;
  }

  delete(x: number): boolean {
    if (this.minVal === null) return false;
    if (this.minVal === this.maxVal) {
      if (x !== this.minVal) return false;
      this.minVal = null;
      this.maxVal = null;
      return true;
    }
    if (this.bits === 1) {
      if (x !== 0 && x !== 1) return false;
      this.minVal = x === 0 ? 1 : 0;
      this.maxVal = this.minVal;
      return true;
    }
    if (x === this.minVal) {
      const firstCluster = this.summary!.min()!;
      x = this.idx(firstCluster, this.clusters!.get(firstCluster)!.min()!);
      this.minVal = x;
    }
    const h = this.hi(x);
    const l = this.lo(x);
    const cluster = this.clusters!.get(h);
    if (!cluster) return false;
    const had = cluster.delete(l);
    if (!had) return false;
    if (cluster.min() === null) {
      this.summary!.delete(h);
      this.clusters!.delete(h);
      if (x === this.maxVal) {
        const sMax = this.summary!.max();
        if (sMax === null) this.maxVal = this.minVal;
        else this.maxVal = this.idx(sMax, this.clusters!.get(sMax)!.max()!);
      }
    } else if (x === this.maxVal) {
      this.maxVal = this.idx(h, cluster.max()!);
    }
    return true;
  }

  successor(x: number): number | null {
    if (this.bits === 1) {
      if (x === 0 && this.maxVal === 1) return 1;
      return null;
    }
    if (this.minVal !== null && x < this.minVal) return this.minVal;
    const h = this.hi(x);
    const l = this.lo(x);
    const cluster = this.clusters?.get(h);
    const maxLow = cluster ? cluster.max() : null;
    if (maxLow !== null && l < maxLow) {
      const off = cluster!.successor(l);
      return off === null ? null : this.idx(h, off);
    }
    const succCluster = this.summary ? this.summary.successor(h) : null;
    if (succCluster === null) return null;
    return this.idx(succCluster, this.clusters!.get(succCluster)!.min()!);
  }

  predecessor(x: number): number | null {
    if (this.bits === 1) {
      if (x === 1 && this.minVal === 0) return 0;
      return null;
    }
    if (this.maxVal !== null && x > this.maxVal) return this.maxVal;
    const h = this.hi(x);
    const l = this.lo(x);
    const cluster = this.clusters?.get(h);
    const minLow = cluster ? cluster.min() : null;
    if (minLow !== null && l > minLow) {
      const off = cluster!.predecessor(l);
      return off === null ? null : this.idx(h, off);
    }
    const predCluster = this.summary ? this.summary.predecessor(h) : null;
    if (predCluster === null) {
      if (this.minVal !== null && x > this.minVal) return this.minVal;
      return null;
    }
    return this.idx(predCluster, this.clusters!.get(predCluster)!.max()!);
  }
}

export function vanEmdeBoasTree(universe: number): VanEmdeBoasTree {
  return new VanEmdeBoasTree(universe);
}
