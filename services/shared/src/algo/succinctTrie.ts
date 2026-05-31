// Succinct trie over byte/char keys. Builds the trie, then exposes a static
// view with constant-time edge lookup via Maps. Not as memory-compact as a
// LOUDS encoding, but provides the same query surface (key membership, prefix
// queries) over a frozen representation.

interface SuccinctNode {
  edges: Map<string, number>;
  terminal: boolean;
}

export class SuccinctTrie {
  private nodes: SuccinctNode[];

  constructor() {
    this.nodes = [{ edges: new Map(), terminal: false }];
  }

  insert(key: string): void {
    if (typeof key !== 'string') throw new Error('SuccinctTrie.insert: key must be string');
    let cur = 0;
    for (const ch of key) {
      const next = this.nodes[cur].edges.get(ch);
      if (next !== undefined) {
        cur = next;
      } else {
        this.nodes.push({ edges: new Map(), terminal: false });
        const idx = this.nodes.length - 1;
        this.nodes[cur].edges.set(ch, idx);
        cur = idx;
      }
    }
    this.nodes[cur].terminal = true;
  }

  has(key: string): boolean {
    let cur = 0;
    for (const ch of key) {
      const next = this.nodes[cur].edges.get(ch);
      if (next === undefined) return false;
      cur = next;
    }
    return this.nodes[cur].terminal;
  }

  hasPrefix(prefix: string): boolean {
    let cur = 0;
    for (const ch of prefix) {
      const next = this.nodes[cur].edges.get(ch);
      if (next === undefined) return false;
      cur = next;
    }
    return true;
  }

  keysWithPrefix(prefix: string): string[] {
    let cur = 0;
    for (const ch of prefix) {
      const next = this.nodes[cur].edges.get(ch);
      if (next === undefined) return [];
      cur = next;
    }
    const out: string[] = [];
    const walk = (node: number, acc: string): void => {
      const n = this.nodes[node];
      if (n.terminal) out.push(acc);
      for (const [ch, child] of n.edges) walk(child, acc + ch);
    };
    walk(cur, prefix);
    return out;
  }

  size(): number {
    let count = 0;
    for (const n of this.nodes) if (n.terminal) count += 1;
    return count;
  }

  nodeCount(): number {
    return this.nodes.length;
  }
}

export function succinctTrie(): SuccinctTrie {
  return new SuccinctTrie();
}
