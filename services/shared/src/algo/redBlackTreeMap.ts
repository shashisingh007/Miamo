type Color = 'RED' | 'BLACK';

interface RBNode<K, V> {
  key: K;
  value: V;
  color: Color;
  left: RBNode<K, V> | null;
  right: RBNode<K, V> | null;
  parent: RBNode<K, V> | null;
}

export type Comparator<K> = (a: K, b: K) => number;

export class RedBlackTreeMap<K, V> {
  private root: RBNode<K, V> | null = null;
  private count = 0;
  private readonly compare: Comparator<K>;

  constructor(compare: Comparator<K>) {
    this.compare = compare;
  }

  size(): number {
    return this.count;
  }

  has(key: K): boolean {
    return this.findNode(key) !== null;
  }

  get(key: K): V | undefined {
    const n = this.findNode(key);
    return n === null ? undefined : n.value;
  }

  set(key: K, value: V): void {
    if (this.root === null) {
      this.root = { key, value, color: 'BLACK', left: null, right: null, parent: null };
      this.count = 1;
      return;
    }
    let cur = this.root;
    let parent: RBNode<K, V> = cur;
    while (true) {
      const c = this.compare(key, cur.key);
      if (c === 0) {
        cur.value = value;
        return;
      }
      parent = cur;
      const next = c < 0 ? cur.left : cur.right;
      if (next === null) break;
      cur = next;
    }
    const node: RBNode<K, V> = { key, value, color: 'RED', left: null, right: null, parent };
    if (this.compare(key, parent.key) < 0) parent.left = node;
    else parent.right = node;
    this.count += 1;
    this.fixInsert(node);
  }

  keys(): K[] {
    const out: K[] = [];
    const stack: RBNode<K, V>[] = [];
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

  values(): V[] {
    const out: V[] = [];
    const stack: RBNode<K, V>[] = [];
    let cur = this.root;
    while (cur !== null || stack.length > 0) {
      while (cur !== null) {
        stack.push(cur);
        cur = cur.left;
      }
      cur = stack.pop()!;
      out.push(cur.value);
      cur = cur.right;
    }
    return out;
  }

  private findNode(key: K): RBNode<K, V> | null {
    let cur = this.root;
    while (cur !== null) {
      const c = this.compare(key, cur.key);
      if (c === 0) return cur;
      cur = c < 0 ? cur.left : cur.right;
    }
    return null;
  }

  private rotateLeft(x: RBNode<K, V>): void {
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

  private rotateRight(x: RBNode<K, V>): void {
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

  private fixInsert(z: RBNode<K, V>): void {
    while (z.parent !== null && z.parent.color === 'RED') {
      const parent = z.parent;
      const grand = parent.parent!;
      if (parent === grand.left) {
        const uncle = grand.right;
        if (uncle !== null && uncle.color === 'RED') {
          parent.color = 'BLACK';
          uncle.color = 'BLACK';
          grand.color = 'RED';
          z = grand;
        } else {
          if (z === parent.right) {
            z = parent;
            this.rotateLeft(z);
          }
          z.parent!.color = 'BLACK';
          z.parent!.parent!.color = 'RED';
          this.rotateRight(z.parent!.parent!);
        }
      } else {
        const uncle = grand.left;
        if (uncle !== null && uncle.color === 'RED') {
          parent.color = 'BLACK';
          uncle.color = 'BLACK';
          grand.color = 'RED';
          z = grand;
        } else {
          if (z === parent.left) {
            z = parent;
            this.rotateRight(z);
          }
          z.parent!.color = 'BLACK';
          z.parent!.parent!.color = 'RED';
          this.rotateLeft(z.parent!.parent!);
        }
      }
    }
    this.root!.color = 'BLACK';
  }
}
