// Fenwick tree (Binary Indexed Tree) for point update / prefix max queries.
// Supports update(i, value) which sets pos[i] = max(pos[i], value), and
// prefixMax(i) which returns the maximum of values in [0, i].
//
// NOTE: This BIT only supports non-decreasing point updates. Decreasing
// updates would require a different structure (e.g. segment tree).

export class FenwickPointMax {
  private readonly n: number;
  private tree: number[];
  private readonly identity: number;

  constructor(size: number, identity = -Infinity) {
    if (!Number.isInteger(size) || size < 0) {
      throw new RangeError('size must be a non-negative integer');
    }
    this.n = size;
    this.identity = identity;
    this.tree = new Array<number>(size + 1).fill(identity);
  }

  size(): number {
    return this.n;
  }

  update(index: number, value: number): void {
    if (index < 0 || index >= this.n) throw new RangeError('index out of bounds');
    let i = index + 1;
    while (i <= this.n) {
      if (value > this.tree[i]) this.tree[i] = value;
      i += i & -i;
    }
  }

  prefixMax(index: number): number {
    if (index < 0 || index >= this.n) throw new RangeError('index out of bounds');
    let i = index + 1;
    let best = this.identity;
    while (i > 0) {
      if (this.tree[i] > best) best = this.tree[i];
      i -= i & -i;
    }
    return best;
  }
}
