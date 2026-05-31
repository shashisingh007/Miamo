// Rendezvous (Highest Random Weight, HRW) hashing.
// Each (node, key) yields a deterministic weight; pick top-N nodes by weight.

function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mix(a: number, b: number): number {
  // Murmur-like finalizer of (a XOR b)
  let h = (a ^ b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h;
}

export interface RendezvousOptions {
  hash?: (s: string) => number;
}

export class RendezvousHashing {
  private readonly nodes = new Map<string, number>(); // node -> hash
  private readonly hashFn: (s: string) => number;

  constructor(options: RendezvousOptions = {}) {
    this.hashFn = options.hash ?? fnv1a32;
  }

  addNode(node: string): void {
    if (typeof node !== 'string' || node.length === 0) {
      throw new TypeError('node must be a non-empty string');
    }
    this.nodes.set(node, this.hashFn(node));
  }

  removeNode(node: string): boolean {
    return this.nodes.delete(node);
  }

  size(): number {
    return this.nodes.size;
  }

  pick(key: string): string | undefined {
    if (typeof key !== 'string') throw new TypeError('key must be a string');
    if (this.nodes.size === 0) return undefined;
    const kh = this.hashFn(key);
    let best: string | undefined;
    let bestW = -1;
    for (const [node, nh] of this.nodes) {
      const w = mix(nh, kh);
      if (w > bestW || (w === bestW && best !== undefined && node < best)) {
        bestW = w;
        best = node;
      }
    }
    return best;
  }

  pickN(key: string, n: number): string[] {
    if (!Number.isInteger(n) || n < 0) throw new RangeError('n must be a non-negative integer');
    if (n === 0 || this.nodes.size === 0) return [];
    const kh = this.hashFn(key);
    const arr: { node: string; w: number }[] = [];
    for (const [node, nh] of this.nodes) arr.push({ node, w: mix(nh, kh) });
    arr.sort((a, b) => (b.w - a.w) || (a.node < b.node ? -1 : a.node > b.node ? 1 : 0));
    return arr.slice(0, Math.min(n, arr.length)).map((x) => x.node);
  }
}
