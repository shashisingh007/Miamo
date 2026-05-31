// Dynamic segment trees with merge support over a fixed range [0, N).
// Each tree starts empty (root = 0) and supports:
//   - pointAdd(treeId, index, delta): add delta to position `index` in tree
//   - prefixSum(treeId, index): inclusive prefix sum [0, index] in tree
//   - merge(treeA, treeB): merge tree B into tree A; afterwards B is invalidated
//
// Designed for offline aggregation across many subtrees where each tree is
// sparse. Memory grows O(updates * log N).

export class SegmentTreeMergePool {
  private readonly N: number;
  private left: number[] = [0];
  private right: number[] = [0];
  private sum: number[] = [0];
  // Each tree is a root index into the node arrays; 0 means "empty".
  private roots: number[] = [];

  constructor(rangeSize: number) {
    if (!Number.isInteger(rangeSize) || rangeSize <= 0) {
      throw new RangeError('rangeSize must be a positive integer');
    }
    this.N = rangeSize;
  }

  newTree(): number {
    this.roots.push(0);
    return this.roots.length - 1;
  }

  treeCount(): number {
    return this.roots.length;
  }

  private alloc(): number {
    this.left.push(0);
    this.right.push(0);
    this.sum.push(0);
    return this.left.length - 1;
  }

  private addNode(node: number, lo: number, hi: number, idx: number, delta: number): number {
    if (node === 0) node = this.alloc();
    if (lo === hi) {
      this.sum[node] += delta;
      return node;
    }
    const mid = (lo + hi) >> 1;
    if (idx <= mid) this.left[node] = this.addNode(this.left[node], lo, mid, idx, delta);
    else this.right[node] = this.addNode(this.right[node], mid + 1, hi, idx, delta);
    this.sum[node] = this.sum[this.left[node]] + this.sum[this.right[node]];
    return node;
  }

  pointAdd(treeId: number, index: number, delta: number): void {
    if (treeId < 0 || treeId >= this.roots.length) throw new RangeError('treeId out of range');
    if (index < 0 || index >= this.N) throw new RangeError('index out of range');
    this.roots[treeId] = this.addNode(this.roots[treeId], 0, this.N - 1, index, delta);
  }

  private queryNode(node: number, lo: number, hi: number, ql: number, qr: number): number {
    if (node === 0 || qr < lo || ql > hi) return 0;
    if (ql <= lo && hi <= qr) return this.sum[node];
    const mid = (lo + hi) >> 1;
    return (
      this.queryNode(this.left[node], lo, mid, ql, qr) +
      this.queryNode(this.right[node], mid + 1, hi, ql, qr)
    );
  }

  prefixSum(treeId: number, index: number): number {
    if (treeId < 0 || treeId >= this.roots.length) throw new RangeError('treeId out of range');
    if (index < 0 || index >= this.N) throw new RangeError('index out of range');
    return this.queryNode(this.roots[treeId], 0, this.N - 1, 0, index);
  }

  rangeSum(treeId: number, lo: number, hi: number): number {
    if (treeId < 0 || treeId >= this.roots.length) throw new RangeError('treeId out of range');
    if (lo < 0 || hi >= this.N || lo > hi) throw new RangeError('range out of range');
    return this.queryNode(this.roots[treeId], 0, this.N - 1, lo, hi);
  }

  private mergeNodes(a: number, b: number, lo: number, hi: number): number {
    if (a === 0) return b;
    if (b === 0) return a;
    if (lo === hi) {
      this.sum[a] += this.sum[b];
      return a;
    }
    const mid = (lo + hi) >> 1;
    this.left[a] = this.mergeNodes(this.left[a], this.left[b], lo, mid);
    this.right[a] = this.mergeNodes(this.right[a], this.right[b], mid + 1, hi);
    this.sum[a] = this.sum[this.left[a]] + this.sum[this.right[a]];
    return a;
  }

  merge(treeA: number, treeB: number): void {
    if (treeA === treeB) throw new Error('cannot merge tree into itself');
    if (treeA < 0 || treeA >= this.roots.length) throw new RangeError('treeA out of range');
    if (treeB < 0 || treeB >= this.roots.length) throw new RangeError('treeB out of range');
    this.roots[treeA] = this.mergeNodes(this.roots[treeA], this.roots[treeB], 0, this.N - 1);
    this.roots[treeB] = -1; // invalidated
  }
}
