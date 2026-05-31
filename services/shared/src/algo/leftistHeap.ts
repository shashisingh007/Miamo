interface LeftistNode<K, V> {
  key: K;
  value: V;
  left: LeftistNode<K, V> | null;
  right: LeftistNode<K, V> | null;
  s: number;
}

export type Comparator<K> = (a: K, b: K) => number;

export class LeftistHeap<K, V> {
  private root: LeftistNode<K, V> | null = null;
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
    const node: LeftistNode<K, V> = { key, value, left: null, right: null, s: 1 };
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

  private meld(a: LeftistNode<K, V> | null, b: LeftistNode<K, V> | null): LeftistNode<K, V> | null {
    if (a === null) return b;
    if (b === null) return a;
    let root: LeftistNode<K, V>;
    let rest: LeftistNode<K, V>;
    if (this.compare(a.key, b.key) <= 0) { root = a; rest = b; } else { root = b; rest = a; }
    root.right = this.meld(root.right, rest);
    const leftS = root.left === null ? 0 : root.left.s;
    const rightS = root.right === null ? 0 : root.right.s;
    if (leftS < rightS) { const tmp = root.left; root.left = root.right; root.right = tmp; }
    const newRightS = root.right === null ? 0 : root.right.s;
    root.s = newRightS + 1;
    return root;
  }
}
