interface PairingNode<K, V> {
  key: K;
  value: V;
  child: PairingNode<K, V> | null;
  sibling: PairingNode<K, V> | null;
}

export type Comparator<K> = (a: K, b: K) => number;

export class PairingHeap<K, V> {
  private root: PairingNode<K, V> | null = null;
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
    const node: PairingNode<K, V> = { key, value, child: null, sibling: null };
    this.root = this.meld(this.root, node);
    this.count += 1;
  }

  extractMin(): { key: K; value: V } | null {
    if (this.root === null) return null;
    const out = { key: this.root.key, value: this.root.value };
    this.root = this.mergePairs(this.root.child);
    this.count -= 1;
    return out;
  }

  private meld(a: PairingNode<K, V> | null, b: PairingNode<K, V> | null): PairingNode<K, V> | null {
    if (a === null) return b;
    if (b === null) return a;
    if (this.compare(a.key, b.key) <= 0) {
      b.sibling = a.child;
      a.child = b;
      return a;
    } else {
      a.sibling = b.child;
      b.child = a;
      return b;
    }
  }

  private mergePairs(first: PairingNode<K, V> | null): PairingNode<K, V> | null {
    if (first === null) return null;
    const list: PairingNode<K, V>[] = [];
    let cur: PairingNode<K, V> | null = first;
    while (cur !== null) {
      const next: PairingNode<K, V> | null = cur.sibling;
      cur.sibling = null;
      list.push(cur);
      cur = next;
    }
    const pairs: (PairingNode<K, V> | null)[] = [];
    for (let i = 0; i + 1 < list.length; i += 2) pairs.push(this.meld(list[i], list[i + 1]));
    if (list.length % 2 === 1) pairs.push(list[list.length - 1]);
    let acc: PairingNode<K, V> | null = pairs.length > 0 ? pairs[pairs.length - 1] : null;
    for (let i = pairs.length - 2; i >= 0; i--) acc = this.meld(pairs[i], acc);
    return acc;
  }
}
