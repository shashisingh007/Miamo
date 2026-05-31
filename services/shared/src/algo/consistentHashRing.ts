// Consistent hash ring with virtual nodes.

function fnv1a32(s: string, seed = 0x811c9dc5): number {
  let h = seed;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export type HashFn = (s: string) => number;

export class ConsistentHashRing {
  private readonly virtualsPerNode: number;
  private readonly hash: HashFn;
  private readonly nodeOfHash = new Map<number, string>();
  private readonly nodes = new Set<string>();
  private sortedHashes: number[] = [];

  constructor(virtualsPerNode = 64, hash?: HashFn) {
    if (!Number.isInteger(virtualsPerNode) || virtualsPerNode <= 0) {
      throw new RangeError('virtualsPerNode must be a positive integer');
    }
    this.virtualsPerNode = virtualsPerNode;
    this.hash = hash ?? fnv1a32;
  }

  get nodeCount(): number {
    return this.nodes.size;
  }

  get virtualCount(): number {
    return this.sortedHashes.length;
  }

  addNode(node: string): void {
    if (typeof node !== 'string' || node.length === 0) {
      throw new TypeError('node must be a non-empty string');
    }
    if (this.nodes.has(node)) return;
    this.nodes.add(node);
    for (let v = 0; v < this.virtualsPerNode; v += 1) {
      const h = this.hash(`${node}#${v}`);
      if (!this.nodeOfHash.has(h)) this.nodeOfHash.set(h, node);
    }
    this.rebuild();
  }

  removeNode(node: string): boolean {
    if (!this.nodes.has(node)) return false;
    this.nodes.delete(node);
    for (let v = 0; v < this.virtualsPerNode; v += 1) {
      const h = this.hash(`${node}#${v}`);
      if (this.nodeOfHash.get(h) === node) this.nodeOfHash.delete(h);
    }
    this.rebuild();
    return true;
  }

  private rebuild(): void {
    this.sortedHashes = Array.from(this.nodeOfHash.keys()).sort((a, b) => a - b);
  }

  getNode(key: string): string | undefined {
    if (this.sortedHashes.length === 0) return undefined;
    const h = this.hash(key);
    let lo = 0;
    let hi = this.sortedHashes.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.sortedHashes[mid] < h) lo = mid + 1;
      else hi = mid;
    }
    const idx = lo === this.sortedHashes.length ? 0 : lo;
    return this.nodeOfHash.get(this.sortedHashes[idx]);
  }
}
