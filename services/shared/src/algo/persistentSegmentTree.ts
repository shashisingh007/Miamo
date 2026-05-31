// Persistent segment tree (version history). Each update creates O(log n) new
// nodes; queries at any prior version run in O(log n). Useful for offline
// range queries on evolving arrays.

interface PsNode {
  sum: number;
  left: PsNode | null;
  right: PsNode | null;
}

function build(lo: number, hi: number, arr: number[]): PsNode {
  if (lo === hi) return { sum: arr[lo] ?? 0, left: null, right: null };
  const mid = (lo + hi) >> 1;
  const left = build(lo, mid, arr);
  const right = build(mid + 1, hi, arr);
  return { sum: left.sum + right.sum, left, right };
}

function pointAdd(node: PsNode, lo: number, hi: number, idx: number, delta: number): PsNode {
  if (lo === hi) {
    return { sum: node.sum + delta, left: null, right: null };
  }
  const mid = (lo + hi) >> 1;
  if (idx <= mid) {
    const newLeft = pointAdd(node.left!, lo, mid, idx, delta);
    return { sum: newLeft.sum + node.right!.sum, left: newLeft, right: node.right };
  }
  const newRight = pointAdd(node.right!, mid + 1, hi, idx, delta);
  return { sum: node.left!.sum + newRight.sum, left: node.left, right: newRight };
}

function rangeSum(node: PsNode | null, lo: number, hi: number, qL: number, qR: number): number {
  if (!node || qR < lo || hi < qL) return 0;
  if (qL <= lo && hi <= qR) return node.sum;
  const mid = (lo + hi) >> 1;
  return rangeSum(node.left, lo, mid, qL, qR) + rangeSum(node.right, mid + 1, hi, qL, qR);
}

export class PersistentSegmentTree {
  private n: number;
  private versions: PsNode[];

  constructor(input: number[] | number) {
    if (typeof input === 'number') {
      if (!Number.isInteger(input) || input < 0) {
        throw new Error('PersistentSegmentTree: size must be non-negative integer');
      }
      this.n = input;
    } else {
      this.n = input.length;
    }
    const initial: number[] = typeof input === 'number' ? new Array<number>(this.n).fill(0) : input.slice();
    this.versions = [];
    if (this.n > 0) this.versions.push(build(0, this.n - 1, initial));
    else this.versions.push({ sum: 0, left: null, right: null });
  }

  versionCount(): number {
    return this.versions.length;
  }

  update(version: number, index: number, delta: number): number {
    if (version < 0 || version >= this.versions.length) throw new Error('PersistentSegmentTree.update: bad version');
    if (index < 0 || index >= this.n) throw new Error('PersistentSegmentTree.update: bad index');
    const newRoot = pointAdd(this.versions[version], 0, this.n - 1, index, delta);
    this.versions.push(newRoot);
    return this.versions.length - 1;
  }

  query(version: number, l: number, r: number): number {
    if (version < 0 || version >= this.versions.length) throw new Error('PersistentSegmentTree.query: bad version');
    if (this.n === 0) return 0;
    if (l < 0 || r >= this.n || l > r) throw new Error('PersistentSegmentTree.query: bad range');
    return rangeSum(this.versions[version], 0, this.n - 1, l, r);
  }
}

export function persistentSegmentTree(input: number[] | number): PersistentSegmentTree {
  return new PersistentSegmentTree(input);
}
