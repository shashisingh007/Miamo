interface SplayNode<T> {
  key: T;
  left: SplayNode<T> | null;
  right: SplayNode<T> | null;
  parent: SplayNode<T> | null;
}

export type Comparator<T> = (a: T, b: T) => number;

export class SplayTreeSet<T> {
  private root: SplayNode<T> | null = null;
  private count = 0;
  private readonly compare: Comparator<T>;

  constructor(compare: Comparator<T>) {
    this.compare = compare;
  }

  size(): number {
    return this.count;
  }

  has(key: T): boolean {
    const n = this.findNode(key);
    if (n !== null) this.splay(n);
    return n !== null;
  }

  add(key: T): boolean {
    if (this.root === null) {
      this.root = { key, left: null, right: null, parent: null };
      this.count = 1;
      return true;
    }
    let cur = this.root;
    let parent: SplayNode<T> = cur;
    while (true) {
      const c = this.compare(key, cur.key);
      if (c === 0) {
        this.splay(cur);
        return false;
      }
      parent = cur;
      const next = c < 0 ? cur.left : cur.right;
      if (next === null) break;
      cur = next;
    }
    const node: SplayNode<T> = { key, left: null, right: null, parent };
    if (this.compare(key, parent.key) < 0) parent.left = node;
    else parent.right = node;
    this.count += 1;
    this.splay(node);
    return true;
  }

  delete(key: T): boolean {
    const n = this.findNode(key);
    if (n === null) return false;
    this.splay(n);
    if (n.left === null) {
      this.root = n.right;
      if (this.root !== null) this.root.parent = null;
    } else if (n.right === null) {
      this.root = n.left;
      this.root.parent = null;
    } else {
      const left = n.left;
      left.parent = null;
      const right = n.right;
      right.parent = null;
      this.root = left;
      let max = left;
      while (max.right !== null) max = max.right;
      this.splay(max);
      this.root!.right = right;
      right.parent = this.root;
    }
    this.count -= 1;
    return true;
  }

  values(): T[] {
    const out: T[] = [];
    const stack: SplayNode<T>[] = [];
    let cur = this.root;
    while (cur !== null || stack.length > 0) {
      while (cur !== null) {
        stack.push(cur);
        cur = cur.left;
      }
      cur = stack.pop()!;
      out.push(cur.key);
      cur = cur.right;
    }
    return out;
  }

  private findNode(key: T): SplayNode<T> | null {
    let cur = this.root;
    while (cur !== null) {
      const c = this.compare(key, cur.key);
      if (c === 0) return cur;
      cur = c < 0 ? cur.left : cur.right;
    }
    return null;
  }

  private splay(x: SplayNode<T>): void {
    while (x.parent !== null) {
      const p = x.parent;
      const g = p.parent;
      if (g === null) {
        if (x === p.left) this.rotateRight(p);
        else this.rotateLeft(p);
      } else if (x === p.left && p === g.left) {
        this.rotateRight(g);
        this.rotateRight(p);
      } else if (x === p.right && p === g.right) {
        this.rotateLeft(g);
        this.rotateLeft(p);
      } else if (x === p.right && p === g.left) {
        this.rotateLeft(p);
        this.rotateRight(g);
      } else {
        this.rotateRight(p);
        this.rotateLeft(g);
      }
    }
    this.root = x;
  }

  private rotateLeft(x: SplayNode<T>): void {
    const y = x.right!;
    x.right = y.left;
    if (y.left !== null) y.left.parent = x;
    y.parent = x.parent;
    if (x.parent === null) this.root = y;
    else if (x === x.parent.left) x.parent.left = y;
    else x.parent.right = y;
    y.left = x;
    x.parent = y;
  }

  private rotateRight(x: SplayNode<T>): void {
    const y = x.left!;
    x.left = y.right;
    if (y.right !== null) y.right.parent = x;
    y.parent = x.parent;
    if (x.parent === null) this.root = y;
    else if (x === x.parent.right) x.parent.right = y;
    else x.parent.left = y;
    y.right = x;
    x.parent = y;
  }
}
