// Weighted reservoir sampler — Algorithm A-Res (Efraimidis & Spirakis 2006).
// Pure function: pass injected rng for determinism in tests.

export interface WeightedReservoirItem<T> {
  value: T;
  weight: number; // must be > 0
}

interface KeyedEntry<T> {
  value: T;
  key: number; // -log(U)/w  (we store key = u^(1/w) and keep min-top-k by largest key)
}

export function sampleWeightedReservoir<T>(
  items: ReadonlyArray<WeightedReservoirItem<T>>,
  k: number,
  rng: () => number = Math.random
): T[] {
  if (!Number.isInteger(k) || k < 0) throw new Error('k must be a non-negative integer');
  if (k === 0) return [];
  const heap: KeyedEntry<T>[] = []; // min-heap by key (smallest at index 0)

  for (const it of items) {
    if (!it || typeof it.weight !== 'number' || !Number.isFinite(it.weight) || it.weight <= 0) {
      throw new Error('item weight must be a positive finite number');
    }
    const u = clampRng(rng());
    // Avoid log(0) by lifting u away from 0
    const safeU = u <= 0 ? Number.MIN_VALUE : u;
    const key = Math.pow(safeU, 1 / it.weight);
    if (heap.length < k) {
      heapPush(heap, { value: it.value, key });
    } else if (key > heap[0].key) {
      heap[0] = { value: it.value, key };
      heapSiftDown(heap, 0);
    }
  }
  return heap.sort((a, b) => b.key - a.key).map((e) => e.value);
}

function clampRng(u: number): number {
  if (!Number.isFinite(u)) return 0.5;
  if (u <= 0) return Number.MIN_VALUE;
  if (u >= 1) return 1 - 1e-12;
  return u;
}

function heapPush<T>(heap: KeyedEntry<T>[], e: KeyedEntry<T>): void {
  heap.push(e);
  let i = heap.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (heap[p].key <= heap[i].key) break;
    [heap[p], heap[i]] = [heap[i], heap[p]];
    i = p;
  }
}

function heapSiftDown<T>(heap: KeyedEntry<T>[], i: number): void {
  const n = heap.length;
  while (true) {
    const l = 2 * i + 1;
    const r = 2 * i + 2;
    let s = i;
    if (l < n && heap[l].key < heap[s].key) s = l;
    if (r < n && heap[r].key < heap[s].key) s = r;
    if (s === i) break;
    [heap[s], heap[i]] = [heap[i], heap[s]];
    i = s;
  }
}

export function deterministicRngFromSeed(seed: number): () => number {
  // mulberry32
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
