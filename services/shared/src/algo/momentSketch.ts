export class MomentSketch {
  private readonly k: number;
  private sums: number[];
  private n = 0;

  constructor(k: number) {
    if (!Number.isInteger(k) || k < 1) throw new Error('k must be a positive integer');
    this.k = k;
    this.sums = new Array(k).fill(0);
  }

  add(x: number): void {
    if (!Number.isFinite(x)) throw new Error('value must be finite');
    let p = 1;
    for (let j = 0; j < this.k; j++) {
      p *= x;
      this.sums[j] += p;
    }
    this.n += 1;
  }

  total(): number {
    return this.n;
  }

  order(): number {
    return this.k;
  }

  powerSum(j: number): number {
    if (!Number.isInteger(j) || j < 1 || j > this.k) throw new Error('j out of range');
    return this.sums[j - 1];
  }

  mean(): number {
    if (this.n === 0) throw new Error('empty sketch');
    return this.sums[0] / this.n;
  }

  variance(): number {
    if (this.k < 2) throw new Error('variance requires k >= 2');
    if (this.n === 0) throw new Error('empty sketch');
    const m = this.mean();
    return this.sums[1] / this.n - m * m;
  }

  rawMoment(j: number): number {
    if (this.n === 0) throw new Error('empty sketch');
    return this.powerSum(j) / this.n;
  }
}

export function momentSketch(values: Iterable<number>, k: number): MomentSketch {
  const s = new MomentSketch(k);
  for (const v of values) s.add(v);
  return s;
}
