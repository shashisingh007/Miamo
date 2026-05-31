// Simple Bloom filter — additive infra. New symbols only.

export interface BloomFilterOptions {
  expectedItems: number;
  falsePositiveRate?: number; // default 0.01
}

export interface BloomFilter {
  bits: Uint8Array;
  m: number; // bit count
  k: number; // hash count
  size: number; // logical items added (approximate)
}

function fnv1a(str: string, seed: number): number {
  let h = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function djb2(str: string, seed: number): number {
  let h = (5381 + seed) >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(h, 33) ^ str.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}

function indices(item: string, m: number, k: number): number[] {
  const h1 = fnv1a(item, 0x9747b28c);
  const h2 = djb2(item, 0x85ebca6b);
  const out: number[] = [];
  for (let i = 0; i < k; i++) {
    const combined = (h1 + Math.imul(i, h2) + Math.imul(i, i)) >>> 0;
    out.push(combined % m);
  }
  return out;
}

export function createBloomFilter(opts: BloomFilterOptions): BloomFilter {
  const n = Math.max(1, Math.floor(opts.expectedItems));
  const p = opts.falsePositiveRate ?? 0.01;
  if (p <= 0 || p >= 1) throw new Error('falsePositiveRate must be in (0,1)');
  const m = Math.max(8, Math.ceil((-n * Math.log(p)) / (Math.LN2 * Math.LN2)));
  const k = Math.max(1, Math.round((m / n) * Math.LN2));
  return { bits: new Uint8Array(Math.ceil(m / 8)), m, k, size: 0 };
}

export function addToBloomFilter(bf: BloomFilter, item: string): void {
  for (const i of indices(item, bf.m, bf.k)) {
    bf.bits[i >>> 3] |= 1 << (i & 7);
  }
  bf.size++;
}

export function bloomFilterMayContain(bf: BloomFilter, item: string): boolean {
  for (const i of indices(item, bf.m, bf.k)) {
    if ((bf.bits[i >>> 3] & (1 << (i & 7))) === 0) return false;
  }
  return true;
}

export function estimatedBloomFalsePositiveRate(bf: BloomFilter): number {
  return Math.pow(1 - Math.exp(-(bf.k * bf.size) / bf.m), bf.k);
}
