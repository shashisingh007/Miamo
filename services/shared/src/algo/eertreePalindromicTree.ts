// Eertree / palindromic tree (Rubinchik 2015). Online structure that maintains
// the set of distinct palindromic substrings of a string in O(n) total time
// for alphabets of constant size; total distinct palindromes <= n + 1.

interface PalNode {
  len: number;
  link: number; // longest proper palindromic suffix
  next: Map<number, number>;
}

export class PalindromicTree {
  private readonly nodes: PalNode[];
  private readonly chars: number[] = [];
  private last: number;
  private distinct: number; // number of nodes excluding the two roots

  constructor() {
    // node 0: imaginary root with len = -1
    // node 1: empty palindrome with len = 0, link = 0
    this.nodes = [
      { len: -1, link: 0, next: new Map() },
      { len: 0, link: 0, next: new Map() },
    ];
    this.last = 1;
    this.distinct = 0;
  }

  private getLink(v: number, pos: number, c: number): number {
    let cur = v;
    while (true) {
      const len = this.nodes[cur].len;
      const idx = pos - len - 1;
      if (idx >= 0 && this.chars[idx] === c) return cur;
      cur = this.nodes[cur].link;
    }
  }

  add(ch: string): boolean {
    if (typeof ch !== 'string' || ch.length !== 1) {
      throw new TypeError('add requires a single character string');
    }
    const c = ch.charCodeAt(0);
    const pos = this.chars.length;
    this.chars.push(c);
    const parent = this.getLink(this.last, pos, c);
    const existing = this.nodes[parent].next.get(c);
    if (existing !== undefined) {
      this.last = existing;
      return false;
    }
    const newLen = this.nodes[parent].len + 2;
    let link: number;
    if (newLen === 1) {
      link = 1;
    } else {
      const linkParent = this.getLink(this.nodes[parent].link, pos, c);
      link = this.nodes[linkParent].next.get(c)!;
    }
    const id = this.nodes.length;
    this.nodes.push({ len: newLen, link, next: new Map() });
    this.nodes[parent].next.set(c, id);
    this.last = id;
    this.distinct += 1;
    return true;
  }

  addString(s: string): void {
    if (typeof s !== 'string') throw new TypeError('s must be a string');
    for (let i = 0; i < s.length; i += 1) this.add(s[i]);
  }

  distinctPalindromeCount(): number {
    return this.distinct;
  }

  length(): number {
    return this.chars.length;
  }
}
