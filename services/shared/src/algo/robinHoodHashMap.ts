// Robin-Hood open-addressing hash map (string keys, generic values).
// When inserting, if the probe distance for the candidate slot is larger than
// the resident's, swap and continue with the displaced item — the "rich"
// element gets relocated to make room for the "poor" one. Keeps variance of
// probe distances low.

const EMPTY = Symbol('empty');
const TOMBSTONE = Symbol('tombstone');

function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

interface Slot<V> {
  key: string | typeof EMPTY | typeof TOMBSTONE;
  value: V;
  hash: number;
  dist: number; // distance from ideal slot
}

export interface RobinHoodHashMapOptions {
  initialCapacity?: number;
  loadFactor?: number;
}

export class RobinHoodHashMap<V> {
  private capacity: number;
  private readonly loadFactor: number;
  private buckets: Slot<V>[];
  private filled = 0;

  constructor(options: RobinHoodHashMapOptions = {}) {
    const initialCapacity = options.initialCapacity ?? 16;
    const loadFactor = options.loadFactor ?? 0.75;
    if (!Number.isInteger(initialCapacity) || initialCapacity <= 0 || (initialCapacity & (initialCapacity - 1)) !== 0) {
      throw new RangeError('initialCapacity must be a positive power of two');
    }
    if (!Number.isFinite(loadFactor) || loadFactor <= 0 || loadFactor >= 1) {
      throw new RangeError('loadFactor must be in (0, 1)');
    }
    this.capacity = initialCapacity;
    this.loadFactor = loadFactor;
    this.buckets = this.makeBuckets(this.capacity);
  }

  private makeBuckets(n: number): Slot<V>[] {
    const b: Slot<V>[] = new Array(n);
    for (let i = 0; i < n; i += 1) b[i] = { key: EMPTY, value: undefined as unknown as V, hash: 0, dist: 0 };
    return b;
  }

  size(): number {
    return this.filled;
  }

  private indexFor(hash: number): number {
    return hash & (this.capacity - 1);
  }

  set(key: string, value: V): this {
    if (typeof key !== 'string') throw new TypeError('key must be a string');
    if (this.filled + 1 > this.capacity * this.loadFactor) this.resize(this.capacity * 2);
    this.insertNoResize(key, fnv1a32(key), value);
    return this;
  }

  private insertNoResize(key: string, hash: number, value: V): void {
    let idx = this.indexFor(hash);
    let dist = 0;
    let curKey: string = key;
    let curVal: V = value;
    let curHash = hash;
    while (true) {
      const slot = this.buckets[idx];
      if (slot.key === EMPTY || slot.key === TOMBSTONE) {
        this.buckets[idx] = { key: curKey, value: curVal, hash: curHash, dist };
        this.filled += 1;
        return;
      }
      if (slot.key === curKey && slot.hash === curHash) {
        slot.value = curVal;
        return;
      }
      if (slot.dist < dist) {
        // swap
        const tmpKey = slot.key;
        const tmpVal = slot.value;
        const tmpHash = slot.hash;
        const tmpDist = slot.dist;
        slot.key = curKey;
        slot.value = curVal;
        slot.hash = curHash;
        slot.dist = dist;
        curKey = tmpKey as string;
        curVal = tmpVal;
        curHash = tmpHash;
        dist = tmpDist;
      }
      idx = (idx + 1) & (this.capacity - 1);
      dist += 1;
    }
  }

  get(key: string): V | undefined {
    if (typeof key !== 'string') throw new TypeError('key must be a string');
    const h = fnv1a32(key);
    let idx = this.indexFor(h);
    let dist = 0;
    while (true) {
      const slot = this.buckets[idx];
      if (slot.key === EMPTY) return undefined;
      if (slot.key !== TOMBSTONE && slot.key === key && slot.hash === h) return slot.value;
      if (slot.key !== TOMBSTONE && slot.dist < dist) return undefined;
      idx = (idx + 1) & (this.capacity - 1);
      dist += 1;
      if (dist > this.capacity) return undefined;
    }
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    if (typeof key !== 'string') throw new TypeError('key must be a string');
    const h = fnv1a32(key);
    let idx = this.indexFor(h);
    let dist = 0;
    while (true) {
      const slot = this.buckets[idx];
      if (slot.key === EMPTY) return false;
      if (slot.key !== TOMBSTONE && slot.key === key && slot.hash === h) {
        slot.key = TOMBSTONE;
        slot.value = undefined as unknown as V;
        this.filled -= 1;
        return true;
      }
      if (slot.key !== TOMBSTONE && slot.dist < dist) return false;
      idx = (idx + 1) & (this.capacity - 1);
      dist += 1;
      if (dist > this.capacity) return false;
    }
  }

  private resize(newCap: number): void {
    const oldBuckets = this.buckets;
    this.capacity = newCap;
    this.buckets = this.makeBuckets(newCap);
    this.filled = 0;
    for (const slot of oldBuckets) {
      if (slot.key !== EMPTY && slot.key !== TOMBSTONE) {
        this.insertNoResize(slot.key as string, slot.hash, slot.value);
      }
    }
  }

  keys(): string[] {
    const out: string[] = [];
    for (const slot of this.buckets) {
      if (slot.key !== EMPTY && slot.key !== TOMBSTONE) out.push(slot.key as string);
    }
    return out;
  }
}
