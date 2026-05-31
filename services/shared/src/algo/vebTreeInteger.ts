export class VebTreeInteger {
  private readonly universe: number;
  private min: number | null = null;
  private max: number | null = null;
  private summary: VebTreeInteger | null = null;
  private clusters = new Map<number, VebTreeInteger>();
  private readonly upperBits: number;
  private readonly lowerBits: number;

  constructor(universe: number) {
    if (!Number.isInteger(universe) || universe < 2) {
      throw new RangeError('universe must be an integer >= 2');
    }
    let u = 2;
    while (u < universe) u *= 2;
    this.universe = u;
    const log2u = Math.log2(u);
    this.upperBits = Math.ceil(log2u / 2);
    this.lowerBits = Math.floor(log2u / 2);
  }

  private high(x: number): number {
    return x >>> this.lowerBits;
  }

  private low(x: number): number {
    return x & ((1 << this.lowerBits) - 1);
  }

  private index(h: number, l: number): number {
    return (h << this.lowerBits) | l;
  }

  insert(x: number): void {
    if (!Number.isInteger(x) || x < 0 || x >= this.universe) {
      throw new RangeError('value out of universe');
    }
    if (this.min === null) {
      this.min = x;
      this.max = x;
      return;
    }
    let v = x;
    if (v < this.min) {
      const t = this.min;
      this.min = v;
      v = t;
    }
    if (this.universe > 2) {
      const h = this.high(v);
      const l = this.low(v);
      let cluster = this.clusters.get(h);
      if (!cluster) {
        cluster = new VebTreeInteger(1 << this.lowerBits);
        this.clusters.set(h, cluster);
        if (!this.summary) this.summary = new VebTreeInteger(1 << this.upperBits);
        this.summary.insert(h);
      }
      cluster.insert(l);
    }
    if (v > (this.max ?? -Infinity)) this.max = v;
  }

  contains(x: number): boolean {
    if (this.min === null) return false;
    if (x === this.min || x === this.max) return true;
    if (this.universe <= 2) return false;
    const h = this.high(x);
    const cluster = this.clusters.get(h);
    if (!cluster) return false;
    return cluster.contains(this.low(x));
  }

  successor(x: number): number | null {
    if (this.min !== null && x < this.min) return this.min;
    if (this.universe <= 2) {
      if (x === 0 && this.max === 1) return 1;
      return null;
    }
    const h = this.high(x);
    const l = this.low(x);
    const cluster = this.clusters.get(h);
    if (cluster && cluster.max !== null && l < cluster.max) {
      const offset = cluster.successor(l)!;
      return this.index(h, offset);
    }
    if (!this.summary) return null;
    const succCluster = this.summary.successor(h);
    if (succCluster === null) return null;
    const c = this.clusters.get(succCluster)!;
    return this.index(succCluster, c.min!);
  }

  getMin(): number | null {
    return this.min;
  }

  getMax(): number | null {
    return this.max;
  }
}
