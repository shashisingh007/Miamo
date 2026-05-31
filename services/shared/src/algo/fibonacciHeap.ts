interface FibNode<K, V> {
  key: K;
  value: V;
  degree: number;
  marked: boolean;
  parent: FibNode<K, V> | null;
  child: FibNode<K, V> | null;
  left: FibNode<K, V>;
  right: FibNode<K, V>;
}

export type Comparator<K> = (a: K, b: K) => number;

export class FibonacciHeap<K, V> {
  private min: FibNode<K, V> | null = null;
  private count = 0;
  private readonly compare: Comparator<K>;

  constructor(compare: Comparator<K>) {
    this.compare = compare;
  }

  size(): number {
    return this.count;
  }

  isEmpty(): boolean {
    return this.min === null;
  }

  peek(): { key: K; value: V } | null {
    if (this.min === null) return null;
    return { key: this.min.key, value: this.min.value };
  }

  insert(key: K, value: V): void {
    const node: FibNode<K, V> = {
      key, value, degree: 0, marked: false,
      parent: null, child: null,
      left: null as any, right: null as any,
    };
    node.left = node;
    node.right = node;
    this.mergeIntoRootList(node);
    if (this.min === null || this.compare(node.key, this.min.key) < 0) this.min = node;
    this.count += 1;
  }

  extractMin(): { key: K; value: V } | null {
    const z = this.min;
    if (z === null) return null;
    if (z.child !== null) {
      const children: FibNode<K, V>[] = [];
      let c: FibNode<K, V> = z.child;
      do {
        children.push(c);
        c = c.right;
      } while (c !== z.child);
      for (const child of children) {
        child.parent = null;
        child.left = child;
        child.right = child;
        this.mergeIntoRootList(child);
      }
    }
    this.removeFromRootList(z);
    if (z === z.right) {
      this.min = null;
    } else {
      this.min = z.right;
      this.consolidate();
    }
    this.count -= 1;
    return { key: z.key, value: z.value };
  }

  private mergeIntoRootList(node: FibNode<K, V>): void {
    if (this.min === null) {
      node.left = node;
      node.right = node;
      this.min = node;
    } else {
      node.left = this.min;
      node.right = this.min.right;
      this.min.right.left = node;
      this.min.right = node;
    }
  }

  private removeFromRootList(node: FibNode<K, V>): void {
    node.left.right = node.right;
    node.right.left = node.left;
  }

  private consolidate(): void {
    const maxDegree = Math.floor(Math.log2(this.count + 1)) + 2;
    const A: Array<FibNode<K, V> | null> = new Array(maxDegree + 1).fill(null);
    const roots: FibNode<K, V>[] = [];
    let cur: FibNode<K, V> = this.min!;
    do {
      roots.push(cur);
      cur = cur.right;
    } while (cur !== this.min);

    for (const node of roots) {
      let x = node;
      let d = x.degree;
      while (A[d] !== null) {
        let y = A[d]!;
        if (this.compare(x.key, y.key) > 0) {
          const tmp = x;
          x = y;
          y = tmp;
        }
        this.linkInto(y, x);
        A[d] = null;
        d += 1;
      }
      A[d] = x;
    }

    this.min = null;
    for (const node of A) {
      if (node !== null) {
        node.left = node;
        node.right = node;
        if (this.min === null) {
          this.min = node;
        } else {
          this.mergeIntoRootList(node);
          if (this.compare(node.key, this.min.key) < 0) this.min = node;
        }
      }
    }
  }

  private linkInto(y: FibNode<K, V>, x: FibNode<K, V>): void {
    this.removeFromRootList(y);
    y.parent = x;
    if (x.child === null) {
      x.child = y;
      y.left = y;
      y.right = y;
    } else {
      y.left = x.child;
      y.right = x.child.right;
      x.child.right.left = y;
      x.child.right = y;
    }
    x.degree += 1;
    y.marked = false;
  }
}
