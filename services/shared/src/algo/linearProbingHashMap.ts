// Open-addressing hash map with linear probing and tombstones.

function fnv1a32(s: string): number {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i) & 0xff;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

type Entry<V> = { key: string; value: V; deleted: boolean } | null;

export class LinearProbingHashMap<V> {
  private buckets: Entry<V>[];
  private mask: number;
  private _size = 0;
  private occupied = 0; // includes tombstones
  private readonly maxLoad = 0.7;

  constructor(initialCapacity = 16) {
    if (!Number.isInteger(initialCapacity) || initialCapacity < 1) {
      throw new Error('initialCapacity must be a positive integer');
    }
    const cap = nextPow2(Math.max(8, initialCapacity));
    this.buckets = new Array(cap).fill(null);
    this.mask = cap - 1;
  }

  get size(): number {
    return this._size;
  }

  get capacity(): number {
    return this.buckets.length;
  }

  set(key: string, value: V): this {
    if (typeof key !== 'string') throw new TypeError('key must be a string');
    if ((this.occupied + 1) / this.buckets.length > this.maxLoad) {
      this.resize(this.buckets.length * 2);
    }
    const h = fnv1a32(key);
    let i = h & this.mask;
    let firstTombstone = -1;
    while (this.buckets[i] !== null) {
      const e = this.buckets[i]!;
      if (e.deleted) {
        if (firstTombstone === -1) firstTombstone = i;
      } else if (e.key === key) {
        e.value = value;
        return this;
      }
      i = (i + 1) & this.mask;
    }
    const slot = firstTombstone !== -1 ? firstTombstone : i;
    if (this.buckets[slot] === null) this.occupied++;
    this.buckets[slot] = { key, value, deleted: false };
    this._size++;
    return this;
  }

  get(key: string): V | undefined {
    if (typeof key !== 'string') throw new TypeError('key must be a string');
    const h = fnv1a32(key);
    let i = h & this.mask;
    while (this.buckets[i] !== null) {
      const e = this.buckets[i]!;
      if (!e.deleted && e.key === key) return e.value;
      i = (i + 1) & this.mask;
    }
    return undefined;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    if (typeof key !== 'string') throw new TypeError('key must be a string');
    const h = fnv1a32(key);
    let i = h & this.mask;
    while (this.buckets[i] !== null) {
      const e = this.buckets[i]!;
      if (!e.deleted && e.key === key) {
        e.deleted = true;
        this._size--;
        return true;
      }
      i = (i + 1) & this.mask;
    }
    return false;
  }

  keys(): string[] {
    const out: string[] = [];
    for (const e of this.buckets) if (e && !e.deleted) out.push(e.key);
    return out;
  }

  values(): V[] {
    const out: V[] = [];
    for (const e of this.buckets) if (e && !e.deleted) out.push(e.value);
    return out;
  }

  entries(): Array<[string, V]> {
    const out: Array<[string, V]> = [];
    for (const e of this.buckets) if (e && !e.deleted) out.push([e.key, e.value]);
    return out;
  }

  clear(): void {
    this.buckets.fill(null);
    this._size = 0;
    this.occupied = 0;
  }

  private resize(newCap: number): void {
    const old = this.buckets;
    const cap = nextPow2(newCap);
    this.buckets = new Array(cap).fill(null);
    this.mask = cap - 1;
    this._size = 0;
    this.occupied = 0;
    for (const e of old) {
      if (e && !e.deleted) this.set(e.key, e.value);
    }
  }
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}
