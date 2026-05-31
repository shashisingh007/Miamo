// 64-bit SimHash fingerprint over token bags + Hamming distance helper.
// Uses FNV-1a 64-bit -> deterministic, no external deps. Tokens default to /\w+/.

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const MASK64 = (1n << 64n) - 1n;

export interface SimhashOptions {
  tokenize?: (input: string) => string[];
  ngramSize?: number; // when set, group token n-grams as features
}

const DEFAULT_TOKENIZE = (s: string): string[] => {
  const out = s.toLowerCase().match(/[\p{L}\p{N}]+/gu);
  return out ?? [];
};

function fnv1a64(token: string): bigint {
  let h = FNV_OFFSET;
  for (let i = 0; i < token.length; i++) {
    h ^= BigInt(token.charCodeAt(i) & 0xff);
    h = (h * FNV_PRIME) & MASK64;
  }
  return h;
}

export function simhash64(input: string, opts: SimhashOptions = {}): bigint {
  if (typeof input !== 'string') throw new TypeError('input must be a string');
  const tokenize = opts.tokenize ?? DEFAULT_TOKENIZE;
  const n = opts.ngramSize ?? 1;
  if (!Number.isInteger(n) || n < 1) throw new Error('ngramSize must be >= 1');
  const raw = tokenize(input);
  const features: string[] = n === 1 ? raw : [];
  if (n > 1) {
    for (let i = 0; i + n <= raw.length; i++) features.push(raw.slice(i, i + n).join(' '));
  }
  if (features.length === 0) return 0n;
  const counts = new Map<string, number>();
  for (const f of features) counts.set(f, (counts.get(f) ?? 0) + 1);

  const vector = new Array<number>(64).fill(0);
  for (const [tok, w] of counts) {
    const h = fnv1a64(tok);
    for (let i = 0; i < 64; i++) {
      const bit = (h >> BigInt(i)) & 1n;
      vector[i] += bit === 1n ? w : -w;
    }
  }
  let out = 0n;
  for (let i = 0; i < 64; i++) {
    if (vector[i] > 0) out |= 1n << BigInt(i);
  }
  return out;
}

export function hammingDistance64(a: bigint, b: bigint): number {
  if (typeof a !== 'bigint' || typeof b !== 'bigint') throw new TypeError('inputs must be bigint');
  let x = (a ^ b) & MASK64;
  let count = 0;
  while (x !== 0n) {
    count++;
    x &= x - 1n;
  }
  return count;
}

export function simhashSimilarity64(a: bigint, b: bigint): number {
  return 1 - hammingDistance64(a, b) / 64;
}

export function simhashHex(h: bigint): string {
  return (h & MASK64).toString(16).padStart(16, '0');
}
