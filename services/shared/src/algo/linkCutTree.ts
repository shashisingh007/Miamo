// Link-cut tree (Sleator-Tarjan) over splay-tree auxiliary paths. Supports
// link / cut / connected / pathSumToRoot for trees of integer-weighted nodes.
// Each operation runs in amortized O(log n).

class LctNode {
  parent: LctNode | null = null;
  left: LctNode | null = null;
  right: LctNode | null = null;
  value: number;
  sum: number;       // sum over splay subtree
  flip = false;
  pathParent: LctNode | null = null;
  id: number;

  constructor(id: number, value: number) {
    this.id = id;
    this.value = value;
    this.sum = value;
  }
}

function isSplayRoot(x: LctNode): boolean {
  return x.parent === null || (x.parent.left !== x && x.parent.right !== x);
}

function update(x: LctNode): void {
  x.sum = x.value + (x.left ? x.left.sum : 0) + (x.right ? x.right.sum : 0);
}

function push(x: LctNode): void {
  if (!x.flip) return;
  const tmp = x.left;
  x.left = x.right;
  x.right = tmp;
  if (x.left) x.left.flip = !x.left.flip;
  if (x.right) x.right.flip = !x.right.flip;
  x.flip = false;
}

function rotate(x: LctNode): void {
  const p = x.parent!;
  const g = p.parent;
  const isRootSplay = isSplayRoot(p);
  if (p.left === x) {
    p.left = x.right;
    if (x.right) x.right.parent = p;
    x.right = p;
  } else {
    p.right = x.left;
    if (x.left) x.left.parent = p;
    x.left = p;
  }
  p.parent = x;
  x.parent = g;
  if (!isRootSplay) {
    if (g!.left === p) g!.left = x;
    else if (g!.right === p) g!.right = x;
  }
  // pathParent transfer
  x.pathParent = p.pathParent;
  p.pathParent = null;
  update(p);
  update(x);
}

function splay(x: LctNode): void {
  while (!isSplayRoot(x)) {
    const p = x.parent!;
    if (!isSplayRoot(p)) {
      const g = p.parent!;
      push(g);
      push(p);
      push(x);
      if ((g.left === p) === (p.left === x)) rotate(p);
      else rotate(x);
    } else {
      push(p);
      push(x);
    }
    rotate(x);
  }
  push(x);
}

function access(x: LctNode): LctNode {
  splay(x);
  if (x.right) {
    const r = x.right;
    r.parent = null;
    r.pathParent = x;
    x.right = null;
    update(x);
  }
  let last = x;
  let cur = x.pathParent;
  while (cur !== null) {
    splay(cur);
    if (cur.right) {
      const r = cur.right;
      r.parent = null;
      r.pathParent = cur;
    }
    cur.right = x;
    x.parent = cur;
    x.pathParent = null;
    update(cur);
    last = cur;
    splay(x);
    cur = x.pathParent;
  }
  return last;
}

function makeRoot(x: LctNode): void {
  access(x);
  x.flip = !x.flip;
  push(x);
}

function findRoot(x: LctNode): LctNode {
  access(x);
  let cur = x;
  push(cur);
  while (cur.left) {
    cur = cur.left;
    push(cur);
  }
  splay(cur);
  return cur;
}

export class LinkCutTree {
  private nodes: LctNode[] = [];

  addNode(value = 0): number {
    const id = this.nodes.length;
    this.nodes.push(new LctNode(id, value));
    return id;
  }

  private node(i: number): LctNode {
    if (!Number.isInteger(i) || i < 0 || i >= this.nodes.length) {
      throw new Error('LinkCutTree: invalid node id');
    }
    return this.nodes[i];
  }

  link(u: number, v: number): boolean {
    const a = this.node(u);
    const b = this.node(v);
    if (findRoot(a) === findRoot(b)) return false;
    makeRoot(a);
    a.pathParent = b;
    return true;
  }

  cut(u: number, v: number): boolean {
    const a = this.node(u);
    const b = this.node(v);
    makeRoot(a);
    access(b);
    if (b.left === null || b.left !== a || a.right !== null) return false;
    b.left.parent = null;
    b.left = null;
    update(b);
    return true;
  }

  connected(u: number, v: number): boolean {
    if (u === v) {
      this.node(u);
      return true;
    }
    return findRoot(this.node(u)) === findRoot(this.node(v));
  }

  pathSum(u: number, v: number): number | null {
    const a = this.node(u);
    const b = this.node(v);
    if (findRoot(a) !== findRoot(b)) return null;
    makeRoot(a);
    access(b);
    return b.sum;
  }

  setValue(u: number, value: number): void {
    const a = this.node(u);
    access(a);
    a.value = value;
    update(a);
  }

  size(): number {
    return this.nodes.length;
  }
}

export function linkCutTree(): LinkCutTree {
  return new LinkCutTree();
}
