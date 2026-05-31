/**
 * requestDeduper \u2014 Phase 18 in-flight request coalescing helper (pure-ish).
 *
 * Tracks in-flight promise-returning operations by key and returns the same
 * pending promise to all callers requesting the same key while it is still
 * in flight. Useful for thundering-herd protection on cache misses, lazy
 * config loads, single-flight rate-limited APIs, etc.
 *
 * Resolved/rejected entries are evicted immediately, so each new call after
 * settle starts a fresh fetch.
 */

export type DedupeStats = {
  inFlight: number;
};

export function createRequestDeduper<K = string>() {
  const map = new Map<K, Promise<unknown>>();

  function dedupe<T>(key: K, fetcher: () => Promise<T>): Promise<T> {
    const existing = map.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    let p: Promise<T>;
    try {
      p = Promise.resolve(fetcher());
    } catch (err) {
      return Promise.reject(err);
    }
    map.set(key, p);
    const evict = () => {
      if (map.get(key) === p) map.delete(key);
    };
    // Attach BOTH branches so the original promise is never \u201Cunhandled\u201D
    // from our side, and so the chained promise we don\u2019t return resolves
    // cleanly instead of propagating a rejection.
    p.then(evict, evict);
    return p;
  }

  function inFlight(): number {
    return map.size;
  }

  function has(key: K): boolean {
    return map.has(key);
  }

  function clear(): void {
    map.clear();
  }

  return { dedupe, inFlight, has, clear };
}
