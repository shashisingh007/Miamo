// Simple Rope (concatenation tree for strings) — leaves hold short text slices;
// internal nodes carry the weight (length of left subtree). Supports concat/
// substring/charAt/length in O(log n) for balanced ropes; we keep things simple
// (no auto-rebalancing) which is fine for moderate inputs.

interface Leaf {
  kind: 'leaf';
  text: string;
}

interface Branch {
  kind: 'branch';
  weight: number; // total length of left subtree
  left: Node;
  right: Node;
  length: number;
}

type Node = Leaf | Branch;

function nodeLength(n: Node): number {
  return n.kind === 'leaf' ? n.text.length : n.length;
}

function makeLeaf(text: string): Leaf {
  return { kind: 'leaf', text };
}

function makeBranch(left: Node, right: Node): Branch {
  return {
    kind: 'branch',
    weight: nodeLength(left),
    left,
    right,
    length: nodeLength(left) + nodeLength(right),
  };
}

export class RopeStringBuilder {
  private root: Node;

  constructor(initial: string = '') {
    if (typeof initial !== 'string') throw new TypeError('initial must be a string');
    this.root = makeLeaf(initial);
  }

  length(): number {
    return nodeLength(this.root);
  }

  append(s: string): void {
    if (typeof s !== 'string') throw new TypeError('argument must be a string');
    if (s.length === 0) return;
    this.root = makeBranch(this.root, makeLeaf(s));
  }

  prepend(s: string): void {
    if (typeof s !== 'string') throw new TypeError('argument must be a string');
    if (s.length === 0) return;
    this.root = makeBranch(makeLeaf(s), this.root);
  }

  charAt(index: number): string {
    if (!Number.isInteger(index) || index < 0 || index >= this.length()) {
      throw new RangeError('index out of range');
    }
    let node: Node = this.root;
    let i = index;
    while (node.kind === 'branch') {
      if (i < node.weight) {
        node = node.left;
      } else {
        i -= node.weight;
        node = node.right;
      }
    }
    return node.text[i];
  }

  substring(start: number, end: number): string {
    const len = this.length();
    if (!Number.isInteger(start) || !Number.isInteger(end)) {
      throw new TypeError('start/end must be integers');
    }
    if (start < 0 || end > len || start > end) {
      throw new RangeError('substring range invalid');
    }
    if (start === end) return '';
    const out: string[] = [];
    function walk(node: Node, lo: number, hi: number): void {
      if (node.kind === 'leaf') {
        out.push(node.text.slice(lo, hi));
        return;
      }
      if (lo < node.weight) {
        walk(node.left, lo, Math.min(hi, node.weight));
      }
      if (hi > node.weight) {
        walk(node.right, Math.max(0, lo - node.weight), hi - node.weight);
      }
    }
    walk(this.root, start, end);
    return out.join('');
  }

  toString(): string {
    const parts: string[] = [];
    function walk(n: Node): void {
      if (n.kind === 'leaf') parts.push(n.text);
      else {
        walk(n.left);
        walk(n.right);
      }
    }
    walk(this.root);
    return parts.join('');
  }
}
