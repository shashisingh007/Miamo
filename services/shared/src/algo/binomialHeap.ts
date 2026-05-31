interface BinomialNode<K, V> {
  key: K;
  value: V;
  degree: number;
  parent: BinomialNode<K, V> | null;
  child: BinomialNode<K, V> | null;
  sibling: BinomialNode<K, V> | null;
}

export type Comparator<K> = (a: K, b: K) => number;

export class BinomialHeap<K, V> {
  private head: BinomialNode<K, V> | null = null;
  private count = 0;
  private readonly compare: Comparator<K>;

  constructor(compare: Comparator<K>) {
    this.compare = compare;
  }

  size(): number {
    return this.count;
  }

  isEmpty(): boolean {
    return this.head === null;
  }

  peek(): { key: K; value: V } | null {
    const min = this.findMinNode();
    if (min === null) return null;
    return { key: min.key, value: min.value };
  }

  insert(key: K, value: V): void {
    const node: BinomialNode<K, V> = { key, value, degree: 0, parent: null, child: null, sibling: null };
    const other = new BinomialHeap<K, V>(this.compare);
    other.head = node;
    other.count = 1;
    this.head = this.unionLists(this.head, other.head);
    this.count += 1;
    this.head = this.consolidate(this.head);
  }

  extractMin(): { key: K; value: V } | null {
    if (this.head === null) return null;
    const min = this.findMinNode()!;
    // Detach min from root list
    let prev: BinomialNode<K, V> | null = null;
    let cur: BinomialNode<K, V> | null = this.head;
    while (cur !== null && cur !== min) { prev = cur; cur = cur.sibling; }
    if (prev === null) this.head = min.sibling;
    else prev.sibling = min.sibling;

    // Reverse children list
    let childList: BinomialNode<K, V> | null = null;
    let c = min.child;
    while (c !== null) {
      const next: BinomialNode<K, V> | null = c.sibling;
      c.sibling = childList;
      c.parent = null;
      childList = c;
      c = next;
    }
    this.head = this.unionLists(this.head, childList);
    this.head = this.consolidate(this.head);
    this.count -= 1;
    return { key: min.key, value: min.value };
  }

  private findMinNode(): BinomialNode<K, V> | null {
    if (this.head === null) return null;
    let min: BinomialNode<K, V> = this.head;
    let cur: BinomialNode<K, V> | null = this.head.sibling;
    while (cur !== null) {
      if (this.compare(cur.key, min.key) < 0) min = cur;
      cur = cur.sibling;
    }
    return min;
  }

  private unionLists(a: BinomialNode<K, V> | null, b: BinomialNode<K, V> | null): BinomialNode<K, V> | null {
    let head: BinomialNode<K, V> | null = null;
    let tail: BinomialNode<K, V> | null = null;
    let ai = a;
    let bi = b;
    while (ai !== null && bi !== null) {
      let pick: BinomialNode<K, V>;
      if (ai.degree <= bi.degree) { pick = ai; ai = ai.sibling; }
      else { pick = bi; bi = bi.sibling; }
      if (head === null) head = pick;
      else tail!.sibling = pick;
      tail = pick;
    }
    const rem = ai ?? bi;
    if (head === null) head = rem;
    else if (tail !== null) tail.sibling = rem;
    return head;
  }

  private consolidate(head: BinomialNode<K, V> | null): BinomialNode<K, V> | null {
    if (head === null || head.sibling === null) return head;
    let prev: BinomialNode<K, V> | null = null;
    let x: BinomialNode<K, V> = head;
    let next: BinomialNode<K, V> | null = x.sibling;
    while (next !== null) {
      if (x.degree !== next.degree || (next.sibling !== null && next.sibling.degree === x.degree)) {
        prev = x;
        x = next;
      } else if (this.compare(x.key, next.key) <= 0) {
        x.sibling = next.sibling;
        this.linkChild(next, x);
      } else {
        if (prev === null) head = next;
        else prev.sibling = next;
        this.linkChild(x, next);
        x = next;
      }
      next = x.sibling;
    }
    return head;
  }

  private linkChild(child: BinomialNode<K, V>, parent: BinomialNode<K, V>): void {
    child.parent = parent;
    child.sibling = parent.child;
    parent.child = child;
    parent.degree += 1;
  }
}
