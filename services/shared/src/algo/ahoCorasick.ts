// Aho-Corasick multi-pattern string matcher.

export interface AhoMatch {
  patternIndex: number;
  pattern: string;
  start: number;
  end: number; // exclusive
}

interface Node {
  next: Map<number, number>; // charCode -> node id
  fail: number;
  outputs: number[]; // pattern indexes ending here
  depth: number;
}

export class AhoCorasick {
  private readonly nodes: Node[] = [];
  private readonly patterns: string[];
  private built = false;

  constructor(patterns: ReadonlyArray<string>) {
    if (!Array.isArray(patterns)) throw new TypeError('patterns must be an array');
    for (const p of patterns) {
      if (typeof p !== 'string') throw new TypeError('every pattern must be a string');
    }
    this.patterns = patterns.slice();
    this.newNode(0);
    for (let i = 0; i < this.patterns.length; i++) this.insert(this.patterns[i], i);
    this.build();
  }

  private newNode(depth: number): number {
    const id = this.nodes.length;
    this.nodes.push({ next: new Map(), fail: 0, outputs: [], depth });
    return id;
  }

  private insert(pat: string, idx: number): void {
    if (pat.length === 0) {
      this.nodes[0].outputs.push(idx);
      return;
    }
    let node = 0;
    for (let i = 0; i < pat.length; i++) {
      const c = pat.charCodeAt(i);
      let nxt = this.nodes[node].next.get(c);
      if (nxt === undefined) {
        nxt = this.newNode(this.nodes[node].depth + 1);
        this.nodes[node].next.set(c, nxt);
      }
      node = nxt;
    }
    this.nodes[node].outputs.push(idx);
  }

  private build(): void {
    const queue: number[] = [];
    for (const child of this.nodes[0].next.values()) {
      this.nodes[child].fail = 0;
      queue.push(child);
    }
    while (queue.length) {
      const u = queue.shift()!;
      for (const [c, v] of this.nodes[u].next) {
        let f = this.nodes[u].fail;
        while (f !== 0 && !this.nodes[f].next.has(c)) f = this.nodes[f].fail;
        const fNext = this.nodes[f].next.get(c);
        this.nodes[v].fail = fNext !== undefined && fNext !== v ? fNext : 0;
        for (const out of this.nodes[this.nodes[v].fail].outputs) {
          this.nodes[v].outputs.push(out);
        }
        queue.push(v);
      }
    }
    this.built = true;
  }

  search(text: string): AhoMatch[] {
    if (typeof text !== 'string') throw new TypeError('text must be a string');
    if (!this.built) throw new Error('automaton not built');
    const out: AhoMatch[] = [];
    let node = 0;
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      while (node !== 0 && !this.nodes[node].next.has(c)) node = this.nodes[node].fail;
      const nxt = this.nodes[node].next.get(c);
      if (nxt !== undefined) node = nxt;
      for (const pi of this.nodes[node].outputs) {
        const p = this.patterns[pi];
        out.push({ patternIndex: pi, pattern: p, start: i - p.length + 1, end: i + 1 });
      }
    }
    return out;
  }
}
