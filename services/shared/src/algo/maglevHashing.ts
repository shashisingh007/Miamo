// Maglev hashing (Google, 2016) — simplified.
// Builds a lookup table where each slot maps to one of N backends.
// Each backend i has (offset, skip) derived from two hashes, and writes itself
// into the next free slot of (offset + j*skip) mod M.
// M must be a prime > number of backends; we default to 65537 if backends > 100,
// else 1009. Caller may override.

function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(h, 33) + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

export interface MaglevOptions {
  tableSize?: number;
  hashA?: (s: string) => number;
  hashB?: (s: string) => number;
}

export class MaglevHashing {
  private readonly backends: string[];
  private readonly tableSize: number;
  private table: number[] = []; // entry[i] = backend index
  private readonly hashA: (s: string) => number;
  private readonly hashB: (s: string) => number;

  constructor(backends: string[], options: MaglevOptions = {}) {
    if (!Array.isArray(backends) || backends.length === 0) {
      throw new RangeError('backends must be a non-empty array');
    }
    const seen = new Set<string>();
    for (const b of backends) {
      if (typeof b !== 'string' || b.length === 0) {
        throw new TypeError('backend names must be non-empty strings');
      }
      if (seen.has(b)) throw new RangeError(`duplicate backend: ${b}`);
      seen.add(b);
    }
    const m = options.tableSize ?? (backends.length > 100 ? 65537 : 1009);
    if (!Number.isInteger(m) || m < backends.length + 1) {
      throw new RangeError('tableSize must be an integer > backends.length');
    }
    this.backends = backends.slice();
    this.tableSize = m;
    this.hashA = options.hashA ?? fnv1a32;
    this.hashB = options.hashB ?? djb2;
    this.build();
  }

  private build(): void {
    const M = this.tableSize;
    const N = this.backends.length;
    const offset = new Array<number>(N);
    const skip = new Array<number>(N);
    for (let i = 0; i < N; i += 1) {
      offset[i] = this.hashA(this.backends[i]) % M;
      skip[i] = (this.hashB(this.backends[i]) % (M - 1)) + 1;
    }
    const next = new Array<number>(N).fill(0);
    const entry = new Array<number>(M).fill(-1);
    let filled = 0;
    while (filled < M) {
      for (let i = 0; i < N && filled < M; i += 1) {
        let c = (offset[i] + next[i] * skip[i]) % M;
        while (entry[c] !== -1) {
          next[i] += 1;
          c = (offset[i] + next[i] * skip[i]) % M;
        }
        entry[c] = i;
        next[i] += 1;
        filled += 1;
      }
    }
    this.table = entry;
  }

  pick(key: string): string {
    if (typeof key !== 'string') throw new TypeError('key must be a string');
    const h = this.hashA(key) % this.tableSize;
    return this.backends[this.table[h]];
  }

  size(): number {
    return this.backends.length;
  }

  getTableSize(): number {
    return this.tableSize;
  }
}
