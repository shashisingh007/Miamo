// LSH for Jaccard similarity using a banded MinHash index.
// Build minhash signature of length numHashes for each document; split into
// `bands` bands of `rows = numHashes / bands` rows; hash each band; documents
// sharing at least one band-bucket are candidates.

function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mix32(a: number, b: number): number {
  let h = (a ^ b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h;
}

export interface LshMinhashOptions {
  numHashes?: number;
  bands?: number;
}

export class LshMinhashIndex {
  private readonly numHashes: number;
  private readonly bands: number;
  private readonly rowsPerBand: number;
  private readonly seeds: number[];
  private readonly signatures = new Map<string, number[]>();
  // bandBuckets[band][bucketHash] = list of doc ids
  private readonly bandBuckets: Map<number, Set<string>>[];

  constructor(options: LshMinhashOptions = {}) {
    const numHashes = options.numHashes ?? 64;
    const bands = options.bands ?? 16;
    if (!Number.isInteger(numHashes) || numHashes <= 0) {
      throw new RangeError('numHashes must be a positive integer');
    }
    if (!Number.isInteger(bands) || bands <= 0) {
      throw new RangeError('bands must be a positive integer');
    }
    if (numHashes % bands !== 0) {
      throw new RangeError('numHashes must be divisible by bands');
    }
    this.numHashes = numHashes;
    this.bands = bands;
    this.rowsPerBand = numHashes / bands;
    this.seeds = Array.from({ length: numHashes }, (_, i) => (0x9e3779b9 * (i + 1)) >>> 0);
    this.bandBuckets = Array.from({ length: bands }, () => new Map<number, Set<string>>());
  }

  private signature(tokens: Iterable<string>): number[] {
    const sig = new Array<number>(this.numHashes).fill(0xffffffff);
    let any = false;
    for (const tok of tokens) {
      any = true;
      const baseHash = fnv1a32(tok);
      for (let i = 0; i < this.numHashes; i += 1) {
        const h = mix32(baseHash, this.seeds[i]);
        if (h < sig[i]) sig[i] = h;
      }
    }
    if (!any) {
      for (let i = 0; i < this.numHashes; i += 1) sig[i] = 0;
    }
    return sig;
  }

  add(id: string, tokens: Iterable<string>): void {
    if (typeof id !== 'string' || id.length === 0) {
      throw new TypeError('id must be a non-empty string');
    }
    if (this.signatures.has(id)) throw new RangeError(`duplicate id: ${id}`);
    const sig = this.signature(tokens);
    this.signatures.set(id, sig);
    for (let b = 0; b < this.bands; b += 1) {
      let h = 0x811c9dc5;
      for (let r = 0; r < this.rowsPerBand; r += 1) {
        h = Math.imul(h ^ sig[b * this.rowsPerBand + r], 0x01000193) >>> 0;
      }
      const bucket = this.bandBuckets[b];
      let set = bucket.get(h);
      if (set === undefined) {
        set = new Set();
        bucket.set(h, set);
      }
      set.add(id);
    }
  }

  candidates(tokens: Iterable<string>): string[] {
    const sig = this.signature(tokens);
    const out = new Set<string>();
    for (let b = 0; b < this.bands; b += 1) {
      let h = 0x811c9dc5;
      for (let r = 0; r < this.rowsPerBand; r += 1) {
        h = Math.imul(h ^ sig[b * this.rowsPerBand + r], 0x01000193) >>> 0;
      }
      const bucket = this.bandBuckets[b];
      const set = bucket.get(h);
      if (set !== undefined) for (const id of set) out.add(id);
    }
    return Array.from(out);
  }

  estimatedJaccard(idA: string, idB: string): number {
    const a = this.signatures.get(idA);
    const b = this.signatures.get(idB);
    if (!a || !b) throw new RangeError('unknown id');
    let agree = 0;
    for (let i = 0; i < this.numHashes; i += 1) if (a[i] === b[i]) agree += 1;
    return agree / this.numHashes;
  }

  size(): number {
    return this.signatures.size;
  }
}
