// Eertree (palindromic tree). Online structure that, after appending each
// character, maintains every distinct palindromic substring of the processed
// prefix. Provides total distinct palindrome count and quick membership tests.

interface EertreeNode {
  start: number;     // 0-based start in the source
  end: number;       // 0-based end (inclusive)
  length: number;
  suffixLink: number;
  edges: Map<string, number>;
}

export class Eertree {
  private nodes: EertreeNode[] = [];
  private lastSuffix = 1;
  private s: string[] = [];

  constructor() {
    // imaginary root (length = -1) at index 0
    this.nodes.push({ start: 0, end: -1, length: -1, suffixLink: 0, edges: new Map() });
    // empty palindrome root (length 0) at index 1
    this.nodes.push({ start: 0, end: -1, length: 0, suffixLink: 0, edges: new Map() });
  }

  add(ch: string): boolean {
    if (typeof ch !== 'string' || ch.length !== 1) {
      throw new Error('Eertree.add: must be a single character');
    }
    this.s.push(ch);
    const i = this.s.length - 1;
    let cur = this.lastSuffix;
    while (true) {
      const node = this.nodes[cur];
      const idx = i - node.length - 1;
      if (idx >= 0 && this.s[idx] === ch) break;
      cur = node.suffixLink;
    }
    const existing = this.nodes[cur].edges.get(ch);
    if (existing !== undefined) {
      this.lastSuffix = existing;
      return false;
    }
    const newNode: EertreeNode = {
      start: i - this.nodes[cur].length - 1,
      end: i,
      length: this.nodes[cur].length + 2,
      suffixLink: 1,
      edges: new Map(),
    };
    this.nodes.push(newNode);
    const newIdx = this.nodes.length - 1;
    this.nodes[cur].edges.set(ch, newIdx);

    if (newNode.length === 1) {
      newNode.suffixLink = 1;
    } else {
      let s = this.nodes[cur].suffixLink;
      while (true) {
        const node = this.nodes[s];
        const idx = i - node.length - 1;
        if (idx >= 0 && this.s[idx] === ch) {
          newNode.suffixLink = node.edges.get(ch)!;
          break;
        }
        s = node.suffixLink;
      }
    }
    this.lastSuffix = newIdx;
    return true;
  }

  addString(text: string): void {
    for (const ch of text) this.add(ch);
  }

  uniquePalindromeCount(): number {
    return this.nodes.length - 2;
  }

  palindromes(): string[] {
    const out: string[] = [];
    for (let i = 2; i < this.nodes.length; i += 1) {
      const n = this.nodes[i];
      out.push(this.s.slice(n.start, n.end + 1).join(''));
    }
    return out;
  }
}

export function eertreePalindrome(): Eertree {
  return new Eertree();
}
