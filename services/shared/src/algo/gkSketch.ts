interface Tuple {
  v: number;
  g: number;
  d: number;
}

export class GkSketch {
  private readonly eps: number;
  private tuples: Tuple[] = [];
  private n = 0;

  constructor(epsilon: number) {
    if (!Number.isFinite(epsilon) || epsilon <= 0 || epsilon >= 0.5) {
      throw new Error('epsilon must be in (0, 0.5)');
    }
    this.eps = epsilon;
  }

  add(x: number): void {
    if (!Number.isFinite(x)) throw new Error('value must be finite');
    let i = 0;
    while (i < this.tuples.length && this.tuples[i].v <= x) i++;
    const isEnd = i === 0 || i === this.tuples.length;
    const d = isEnd ? 0 : Math.floor(2 * this.eps * this.n);
    this.tuples.splice(i, 0, { v: x, g: 1, d });
    this.n += 1;
    const period = Math.max(1, Math.floor(1 / (2 * this.eps)));
    if (this.n % period === 0) this.compress();
  }

  private compress(): void {
    const cap = Math.floor(2 * this.eps * this.n);
    for (let i = this.tuples.length - 2; i >= 1; i--) {
      const a = this.tuples[i];
      const b = this.tuples[i + 1];
      if (a.g + b.g + b.d <= cap) {
        b.g += a.g;
        this.tuples.splice(i, 1);
      }
    }
  }

  total(): number {
    return this.n;
  }

  size(): number {
    return this.tuples.length;
  }

  quantile(q: number): number {
    if (!Number.isFinite(q) || q < 0 || q > 1) throw new Error('q must be in [0,1]');
    if (this.n === 0) throw new Error('empty sketch');
    const r = Math.ceil(q * this.n);
    const tol = this.eps * this.n;
    let rMin = 0;
    for (let i = 0; i < this.tuples.length; i++) {
      const t = this.tuples[i];
      rMin += t.g;
      const rMax = rMin + t.d;
      if (rMax > r + tol) {
        return this.tuples[Math.max(0, i - 1)].v;
      }
      if (rMin >= r - tol && rMax <= r + tol) {
        return t.v;
      }
    }
    return this.tuples[this.tuples.length - 1].v;
  }
}

export function gkSketch(values: Iterable<number>, epsilon: number): GkSketch {
  const s = new GkSketch(epsilon);
  for (const v of values) s.add(v);
  return s;
}
