// TTL + capacity LRU cache — additive infra. New symbols only.

export interface LruTtlCacheOptions {
  maxEntries: number;
  ttlMs: number;
  now?: () => number; // injectable clock
}

export interface LruTtlCache<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  has(key: K): boolean;
  delete(key: K): boolean;
  clear(): void;
  readonly size: number;
}

interface Entry<V> {
  value: V;
  expiresAt: number;
}

export function createLruTtlCache<K, V>(opts: LruTtlCacheOptions): LruTtlCache<K, V> {
  const max = Math.floor(opts.maxEntries);
  if (!Number.isFinite(max) || max <= 0) throw new Error('maxEntries must be a positive integer');
  if (!Number.isFinite(opts.ttlMs) || opts.ttlMs <= 0) throw new Error('ttlMs must be positive');
  const now = opts.now ?? (() => Date.now());
  // Map preserves insertion order; we re-insert on get/set to refresh recency.
  const map = new Map<K, Entry<V>>();

  function isExpired(e: Entry<V>): boolean {
    return e.expiresAt <= now();
  }

  function evictIfNeeded() {
    while (map.size > max) {
      const first = map.keys().next();
      if (first.done) break;
      map.delete(first.value);
    }
  }

  return {
    get size() {
      return map.size;
    },
    get(key: K) {
      const e = map.get(key);
      if (!e) return undefined;
      if (isExpired(e)) {
        map.delete(key);
        return undefined;
      }
      // refresh recency
      map.delete(key);
      map.set(key, e);
      return e.value;
    },
    set(key: K, value: V) {
      if (map.has(key)) map.delete(key);
      map.set(key, { value, expiresAt: now() + opts.ttlMs });
      evictIfNeeded();
    },
    has(key: K) {
      const e = map.get(key);
      if (!e) return false;
      if (isExpired(e)) {
        map.delete(key);
        return false;
      }
      return true;
    },
    delete(key: K) {
      return map.delete(key);
    },
    clear() {
      map.clear();
    },
  };
}
