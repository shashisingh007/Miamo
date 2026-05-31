// Implicit treap (randomized BST keyed by insertion-order index).
// Supports insertAt, eraseAt, get, size, toArray.

interface Node {
  value: number;
  priority: number;
  size: number;
  left: Node | null;
  right: Node | null;
}

function size(n: Node | null): number {
  return n === null ? 0 : n.size;
}

function update(n: Node): Node {
  n.size = 1 + size(n.left) + size(n.right);
  return n;
}

function newNode(value: number, rng: () => number): Node {
  return { value, priority: rng(), size: 1, left: null, right: null };
}

function merge(a: Node | null, b: Node | null): Node | null {
  if (a === null) return b;
  if (b === null) return a;
  if (a.priority > b.priority) {
    a.right = merge(a.right, b);
    return update(a);
  }
  b.left = merge(a, b.left);
  return update(b);
}

// split into [0..k) and [k..n)
function split(n: Node | null, k: number): [Node | null, Node | null] {
  if (n === null) return [null, null];
  const leftSize = size(n.left);
  if (k <= leftSize) {
    const [l, r] = split(n.left, k);
    n.left = r;
    return [l, update(n)];
  }
  const [l, r] = split(n.right, k - leftSize - 1);
  n.right = l;
  return [update(n), r];
}

export class ImplicitTreap {
  private root: Node | null = null;
  private rng: () => number;

  constructor(seed = 1) {
    let s = seed >>> 0 || 1;
    this.rng = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s;
    };
  }

  size(): number {
    return size(this.root);
  }

  insertAt(index: number, value: number): void {
    const n = size(this.root);
    if (index < 0 || index > n) throw new RangeError('index out of bounds');
    const [l, r] = split(this.root, index);
    this.root = merge(merge(l, newNode(value, this.rng)), r);
  }

  eraseAt(index: number): number {
    const n = size(this.root);
    if (index < 0 || index >= n) throw new RangeError('index out of bounds');
    const [l, mr] = split(this.root, index);
    const [m, r] = split(mr, 1);
    const v = (m as Node).value;
    this.root = merge(l, r);
    return v;
  }

  get(index: number): number {
    const n = size(this.root);
    if (index < 0 || index >= n) throw new RangeError('index out of bounds');
    let cur = this.root!;
    let k = index;
    while (true) {
      const ls = size(cur.left);
      if (k === ls) return cur.value;
      if (k < ls) cur = cur.left!;
      else {
        k -= ls + 1;
        cur = cur.right!;
      }
    }
  }

  toArray(): number[] {
    const out: number[] = [];
    const walk = (n: Node | null) => {
      if (n === null) return;
      walk(n.left);
      out.push(n.value);
      walk(n.right);
    };
    walk(this.root);
    return out;
  }
}
