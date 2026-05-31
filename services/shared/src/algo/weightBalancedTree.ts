// Weight-balanced tree (BB[alpha]) ordered set with insert / has / delete /
// inOrder / size. Rebalances by full subtree rebuild when the weight of a
// child exceeds alpha * total — simple and avoids per-rotation bookkeeping.

interface WbtNode<T> {
  value: T;
  left: WbtNode<T> | null;
  right: WbtNode<T> | null;
  size: number;
}

const ALPHA = 0.288; // typical BB[alpha] parameter

function size<T>(n: WbtNode<T> | null): number {
  return n === null ? 0 : n.size;
}

function refresh<T>(n: WbtNode<T>): WbtNode<T> {
  n.size = 1 + size(n.left) + size(n.right);
  return n;
}

function collect<T>(n: WbtNode<T> | null, out: T[]): void {
  if (!n) return;
  collect(n.left, out);
  out.push(n.value);
  collect(n.right, out);
}

function buildBalanced<T>(arr: T[], lo: number, hi: number): WbtNode<T> | null {
  if (lo > hi) return null;
  const mid = (lo + hi) >> 1;
  const node: WbtNode<T> = {
    value: arr[mid],
    left: buildBalanced(arr, lo, mid - 1),
    right: buildBalanced(arr, mid + 1, hi),
    size: 0,
  };
  return refresh(node);
}

function rebuild<T>(n: WbtNode<T>): WbtNode<T> {
  const arr: T[] = [];
  collect(n, arr);
  return buildBalanced(arr, 0, arr.length - 1)!;
}

function isBalanced<T>(n: WbtNode<T>): boolean {
  const total = n.size + 1;
  const lw = size(n.left) + 1;
  const rw = size(n.right) + 1;
  return lw >= ALPHA * total && rw >= ALPHA * total;
}

export class WeightBalancedTree<T> {
  private root: WbtNode<T> | null = null;
  private cmp: (a: T, b: T) => number;

  constructor(compare?: (a: T, b: T) => number) {
    this.cmp = compare ?? ((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  }

  size(): number {
    return size(this.root);
  }

  has(value: T): boolean {
    let cur = this.root;
    while (cur) {
      const c = this.cmp(value, cur.value);
      if (c === 0) return true;
      cur = c < 0 ? cur.left : cur.right;
    }
    return false;
  }

  insert(value: T): void {
    this.root = this.insertNode(this.root, value);
  }

  private insertNode(n: WbtNode<T> | null, value: T): WbtNode<T> {
    if (!n) return { value, left: null, right: null, size: 1 };
    const c = this.cmp(value, n.value);
    if (c === 0) return n;
    if (c < 0) n.left = this.insertNode(n.left, value);
    else n.right = this.insertNode(n.right, value);
    refresh(n);
    if (!isBalanced(n)) return rebuild(n);
    return n;
  }

  delete(value: T): boolean {
    const before = size(this.root);
    this.root = this.deleteNode(this.root, value);
    return size(this.root) < before;
  }

  private deleteNode(n: WbtNode<T> | null, value: T): WbtNode<T> | null {
    if (!n) return null;
    const c = this.cmp(value, n.value);
    if (c < 0) n.left = this.deleteNode(n.left, value);
    else if (c > 0) n.right = this.deleteNode(n.right, value);
    else {
      if (!n.left) return n.right;
      if (!n.right) return n.left;
      // pick in-order successor
      let succ = n.right;
      while (succ.left) succ = succ.left;
      n.value = succ.value;
      n.right = this.deleteNode(n.right, succ.value);
    }
    refresh(n);
    if (!isBalanced(n)) return rebuild(n);
    return n;
  }

  inOrder(): T[] {
    const out: T[] = [];
    collect(this.root, out);
    return out;
  }
}

export function weightBalancedTree<T>(compare?: (a: T, b: T) => number): WeightBalancedTree<T> {
  return new WeightBalancedTree<T>(compare);
}
