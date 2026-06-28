/**
 * Tiny LRU with per-entry TTL. ~30 lines, zero deps. Drop-in replacement
 * for the LRUCache in shared/cache when we don't need its full feature set.
 */
type Entry<V> = { v: V; exp: number };

export class LRU<K, V> {
  private map = new Map<K, Entry<V>>();
  constructor(private cap: number) {}

  get(k: K): V | undefined {
    const e = this.map.get(k);
    if (!e) return undefined;
    if (e.exp > 0 && e.exp < Date.now()) {
      this.map.delete(k);
      return undefined;
    }
    // bump recency
    this.map.delete(k);
    this.map.set(k, e);
    return e.v;
  }

  set(k: K, v: V, ttlMs = 0): void {
    if (this.map.has(k)) this.map.delete(k);
    this.map.set(k, { v, exp: ttlMs > 0 ? Date.now() + ttlMs : 0 });
    if (this.map.size > this.cap) {
      const first = this.map.keys().next().value as K | undefined;
      if (first !== undefined) this.map.delete(first);
    }
  }

  get size(): number { return this.map.size; }
  clear(): void { this.map.clear(); }
}
