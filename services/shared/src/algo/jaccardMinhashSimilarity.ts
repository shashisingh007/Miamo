// Jaccard similarity for sets of strings + MinHash signature & estimator.
// Pure: pass a seed for deterministic hashing of permutations.

export function jaccardSimilarity(a: Iterable<string>, b: Iterable<string>): number {
  const A = a instanceof Set ? a : new Set(a);
  const B = b instanceof Set ? b : new Set(b);
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const v of A) if (B.has(v)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 1 : inter / union;
}

function fnv1a32(s: string, seed: number): number {
  let h = (0x811c9dc5 ^ (seed >>> 0)) >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i) & 0xff;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

export interface MinHashOptions {
  numHashes?: number; // default 128
  seed?: number; // base seed
}

export function buildMinHashSignature(
  items: Iterable<string>,
  opts: MinHashOptions = {}
): Uint32Array {
  const numHashes = opts.numHashes ?? 128;
  const seed = opts.seed ?? 0xc0ffee;
  if (!Number.isInteger(numHashes) || numHashes < 1) {
    throw new Error('numHashes must be a positive integer');
  }
  const sig = new Uint32Array(numHashes).fill(0xffffffff);
  let count = 0;
  for (const v of items) {
    count++;
    for (let i = 0; i < numHashes; i++) {
      const h = fnv1a32(v, seed + i * 0x9e3779b1);
      if (h < sig[i]) sig[i] = h;
    }
  }
  if (count === 0) return new Uint32Array(numHashes); // all zeros for empty set
  return sig;
}

export function estimateJaccardFromMinHash(a: Uint32Array, b: Uint32Array): number {
  if (a.length !== b.length) throw new Error('signature lengths differ');
  if (a.length === 0) return 1;
  let matches = 0;
  for (let i = 0; i < a.length; i++) if (a[i] === b[i]) matches++;
  return matches / a.length;
}
