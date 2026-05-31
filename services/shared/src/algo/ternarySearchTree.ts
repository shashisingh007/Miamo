interface TstNode {
  ch: string;
  left: TstNode | null;
  mid: TstNode | null;
  right: TstNode | null;
  endOfKey: boolean;
}

function makeNode(ch: string): TstNode {
  return { ch, left: null, mid: null, right: null, endOfKey: false };
}

export class TernarySearchTree {
  private root: TstNode | null = null;
  private _size = 0;

  insert(key: string): void {
    if (key.length === 0) throw new Error('TernarySearchTree: empty key');
    const before = this._size;
    this.root = this.insertAt(this.root, key, 0);
    if (this._size === before) {
      // duplicate; no growth
    }
  }

  private insertAt(node: TstNode | null, key: string, depth: number): TstNode {
    const ch = key[depth];
    if (node === null) node = makeNode(ch);
    if (ch < node.ch) {
      node.left = this.insertAt(node.left, key, depth);
    } else if (ch > node.ch) {
      node.right = this.insertAt(node.right, key, depth);
    } else if (depth < key.length - 1) {
      node.mid = this.insertAt(node.mid, key, depth + 1);
    } else {
      if (!node.endOfKey) {
        node.endOfKey = true;
        this._size += 1;
      }
    }
    return node;
  }

  has(key: string): boolean {
    if (key.length === 0) return false;
    let node = this.root;
    let depth = 0;
    while (node !== null) {
      const ch = key[depth];
      if (ch < node.ch) node = node.left;
      else if (ch > node.ch) node = node.right;
      else if (depth < key.length - 1) {
        node = node.mid;
        depth += 1;
      } else {
        return node.endOfKey;
      }
    }
    return false;
  }

  keysWithPrefix(prefix: string): string[] {
    const out: string[] = [];
    if (prefix.length === 0) {
      this.collect(this.root, '', out);
      return out;
    }
    let node = this.root;
    let depth = 0;
    while (node !== null) {
      const ch = prefix[depth];
      if (ch < node.ch) node = node.left;
      else if (ch > node.ch) node = node.right;
      else if (depth < prefix.length - 1) {
        node = node.mid;
        depth += 1;
      } else {
        if (node.endOfKey) out.push(prefix);
        this.collect(node.mid, prefix, out);
        return out;
      }
    }
    return out;
  }

  private collect(node: TstNode | null, prefix: string, out: string[]): void {
    if (node === null) return;
    this.collect(node.left, prefix, out);
    const next = prefix + node.ch;
    if (node.endOfKey) out.push(next);
    this.collect(node.mid, next, out);
    this.collect(node.right, prefix, out);
  }

  size(): number {
    return this._size;
  }
}

export function ternarySearchTree(): TernarySearchTree {
  return new TernarySearchTree();
}
