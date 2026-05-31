interface SkewNode<K, V> {
  key: K;
  value: V;
  left: SkewNode<K, V> | null;
  right: SkewNode<K, V> | null;
}

export type Comparator<K> = (a: K, b: K) => number;

export class SkewHeap<K, V> {
  private root: SkewNode<K, V> | null = null;
  private count = 0;
  private readonly compare: Comparator<K>;

  constructor(compare: Comparator<K>) {
    this.compare = compare;
  }

  size(): number {
    return this.count;
  }

  isEmpty(): boolean {
    return this.root === null;
  }

  peek(): { key: K; value: V } | null {
    if (this.root === null) return null;
    return { key: this.root.key, value: this.root.value };
  }

  insert(key: K, value: V): void {
    const node: SkewNode<K, V> = { key, value, left: null, right: null };
    this.root = this.meld(this.root, node);
    this.count += 1;
  }

  extractMin(): { key: K; value: V } | null {
    if (this.root === null) return null;
    const out = { key: this.root.key, value: this.root.value };
    this.root = this.meld(this.root.left, this.root.right);
    this.count -= 1;
    return out;
  }

  private meld(a: SkewNode<K, V> | null, b: SkewNode<K, V> | null): SkewNode<K, V> | null {
    if (a === null) return b;
    if (b === null) return a;
    let root: SkewNode<K, V>;
    let rest: SkewNode<K, V>;
    if (this.compare(a.key, b.key) <= 0) { root = a; rest = b; } else { root = b; rest = a; }
    const newRight = this.meld(root.right, rest);
    root.right = root.left;
    root.left = newRight;
    return root;
  }
}
