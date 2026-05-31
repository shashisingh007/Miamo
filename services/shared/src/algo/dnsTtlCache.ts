export type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'SRV' | 'NS';

export type DnsCacheEntry<T = unknown> = {
  readonly name: string;
  readonly type: DnsRecordType;
  readonly value: T;
  readonly ttlSec: number;
  readonly fetchedAtMs: number;
};

export type DnsCacheLookup<T> =
  | { hit: true; fresh: boolean; entry: DnsCacheEntry<T> }
  | { hit: false };

export type DnsCachePutInput<T> = {
  name: string;
  type: DnsRecordType;
  value: T;
  ttlSec: number;
  nowMs: number;
};

function keyOf(name: string, type: DnsRecordType): string {
  return `${type}\x00${name.toLowerCase()}`;
}

export function createDnsTtlCache<T>(opts?: { maxEntries?: number }) {
  const max = Math.max(1, Math.floor(opts?.maxEntries ?? 1024));
  const store = new Map<string, DnsCacheEntry<T>>();

  function put(input: DnsCachePutInput<T>): DnsCacheEntry<T> {
    const ttlSec = Math.max(0, Math.floor(input.ttlSec));
    const entry: DnsCacheEntry<T> = {
      name: input.name,
      type: input.type,
      value: input.value,
      ttlSec,
      fetchedAtMs: input.nowMs,
    };
    const k = keyOf(input.name, input.type);
    if (store.has(k)) store.delete(k);
    store.set(k, entry);
    while (store.size > max) {
      const first = store.keys().next().value as string;
      store.delete(first);
    }
    return entry;
  }

  function get(name: string, type: DnsRecordType, nowMs: number): DnsCacheLookup<T> {
    const k = keyOf(name, type);
    const e = store.get(k);
    if (!e) return { hit: false };
    const ageMs = nowMs - e.fetchedAtMs;
    const fresh = ageMs >= 0 && ageMs < e.ttlSec * 1000;
    return { hit: true, fresh, entry: e };
  }

  function purgeStale(nowMs: number): number {
    let removed = 0;
    for (const [k, e] of store) {
      if (nowMs - e.fetchedAtMs >= e.ttlSec * 1000) {
        store.delete(k);
        removed++;
      }
    }
    return removed;
  }

  function size(): number {
    return store.size;
  }

  return { put, get, purgeStale, size };
}
