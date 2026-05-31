// LFU cache with O(1) get/set using two-tier doubly-linked-list approach.

interface Item<K, V> {
  key: K;
  value: V;
  freqNode: FreqNode<K, V>;
  prev: Item<K, V> | null;
  next: Item<K, V> | null;
}

interface FreqNode<K, V> {
  freq: number;
  head: Item<K, V> | null;
  tail: Item<K, V> | null;
  prev: FreqNode<K, V> | null;
  next: FreqNode<K, V> | null;
}

export class LfuCache<K, V> {
  private readonly capacity: number;
  private readonly map = new Map<K, Item<K, V>>();
  private freqHead: FreqNode<K, V> | null = null;

  constructor(capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new RangeError('capacity must be a positive integer');
    }
    this.capacity = capacity;
  }

  get size(): number {
    return this.map.size;
  }

  private detachFromFreq(item: Item<K, V>): void {
    const f = item.freqNode;
    if (item.prev) item.prev.next = item.next;
    else f.head = item.next;
    if (item.next) item.next.prev = item.prev;
    else f.tail = item.prev;
    item.prev = null;
    item.next = null;
    if (f.head === null) {
      if (f.prev) f.prev.next = f.next;
      else this.freqHead = f.next;
      if (f.next) f.next.prev = f.prev;
    }
  }

  private appendToFreq(f: FreqNode<K, V>, item: Item<K, V>): void {
    item.freqNode = f;
    item.prev = f.tail;
    item.next = null;
    if (f.tail) f.tail.next = item;
    else f.head = item;
    f.tail = item;
  }

  private ensureFreqAfter(prev: FreqNode<K, V> | null, freq: number): FreqNode<K, V> {
    const next = prev ? prev.next : this.freqHead;
    if (next && next.freq === freq) return next;
    const node: FreqNode<K, V> = { freq, head: null, tail: null, prev, next };
    if (prev) prev.next = node;
    else this.freqHead = node;
    if (next) next.prev = node;
    return node;
  }

  private bump(item: Item<K, V>): void {
    const cur = item.freqNode;
    const newFreq = cur.freq + 1;
    const prev = cur;
    this.detachFromFreq(item);
    const freqStillExists = prev.head !== null;
    const anchor = freqStillExists ? prev : prev.prev;
    const target = this.ensureFreqAfter(anchor, newFreq);
    this.appendToFreq(target, item);
  }

  get(key: K): V | undefined {
    const item = this.map.get(key);
    if (!item) return undefined;
    this.bump(item);
    return item.value;
  }

  set(key: K, value: V): void {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      this.bump(existing);
      return;
    }
    if (this.map.size >= this.capacity) this.evict();
    const item: Item<K, V> = { key, value, freqNode: null as any, prev: null, next: null };
    const target = this.ensureFreqAfter(null, 1);
    this.appendToFreq(target, item);
    this.map.set(key, item);
  }

  private evict(): void {
    if (!this.freqHead || !this.freqHead.head) return;
    const victim = this.freqHead.head;
    this.detachFromFreq(victim);
    this.map.delete(victim.key);
  }

  has(key: K): boolean {
    return this.map.has(key);
  }
}
