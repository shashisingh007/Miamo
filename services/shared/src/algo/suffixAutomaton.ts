// Suffix automaton (Blumer et al. / Ilya Belyaev). Linear-time, linear-space
// finite automaton accepting all substrings of a given string.
// Supports: substring membership in O(|p|), distinct substring count in O(|S|).

interface SamNode {
  next: Map<number, number>;
  link: number;
  len: number;
}

export class SuffixAutomaton {
  private readonly nodes: SamNode[];
  private last: number;
  private readonly text: string;

  constructor(text: string) {
    if (typeof text !== 'string') throw new TypeError('text must be a string');
    this.text = text;
    this.nodes = [{ next: new Map(), link: -1, len: 0 }];
    this.last = 0;
    for (let i = 0; i < text.length; i += 1) this.extend(text.charCodeAt(i));
  }

  private extend(c: number): void {
    const cur = this.nodes.length;
    this.nodes.push({ next: new Map(), link: -1, len: this.nodes[this.last].len + 1 });
    let p = this.last;
    while (p !== -1 && !this.nodes[p].next.has(c)) {
      this.nodes[p].next.set(c, cur);
      p = this.nodes[p].link;
    }
    if (p === -1) {
      this.nodes[cur].link = 0;
    } else {
      const q = this.nodes[p].next.get(c)!;
      if (this.nodes[p].len + 1 === this.nodes[q].len) {
        this.nodes[cur].link = q;
      } else {
        const clone = this.nodes.length;
        this.nodes.push({
          next: new Map(this.nodes[q].next),
          link: this.nodes[q].link,
          len: this.nodes[p].len + 1,
        });
        while (p !== -1 && this.nodes[p].next.get(c) === q) {
          this.nodes[p].next.set(c, clone);
          p = this.nodes[p].link;
        }
        this.nodes[q].link = clone;
        this.nodes[cur].link = clone;
      }
    }
    this.last = cur;
  }

  contains(pattern: string): boolean {
    if (typeof pattern !== 'string') throw new TypeError('pattern must be a string');
    if (pattern.length === 0) return true;
    let cur = 0;
    for (let i = 0; i < pattern.length; i += 1) {
      const next = this.nodes[cur].next.get(pattern.charCodeAt(i));
      if (next === undefined) return false;
      cur = next;
    }
    return true;
  }

  distinctSubstringCount(): number {
    // sum over all nodes (except root) of (len - link.len)
    let count = 0;
    for (let i = 1; i < this.nodes.length; i += 1) {
      const link = this.nodes[i].link;
      const linkLen = link === -1 ? 0 : this.nodes[link].len;
      count += this.nodes[i].len - linkLen;
    }
    return count;
  }

  nodeCount(): number {
    return this.nodes.length;
  }

  source(): string {
    return this.text;
  }
}
