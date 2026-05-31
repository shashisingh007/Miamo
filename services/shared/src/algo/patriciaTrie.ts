// Binary PATRICIA trie keyed by string -> value.
// Edge-labeled with bit positions of distinguishing bits.

interface Leaf<V> {
  kind: 'leaf';
  key: string;
  value: V;
}

interface Branch<V> {
  kind: 'branch';
  bitIndex: number;
  left: Node<V>;
  right: Node<V>;
}

type Node<V> = Leaf<V> | Branch<V>;

function getBit(key: string, bitIndex: number): 0 | 1 {
  const byteIdx = bitIndex >>> 3;
  if (byteIdx >= key.length) return 0;
  const ch = key.charCodeAt(byteIdx);
  return ((ch >>> (7 - (bitIndex & 7))) & 1) as 0 | 1;
}

function firstDiffBit(a: string, b: string): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const ac = i < a.length ? a.charCodeAt(i) : 0;
    const bc = i < b.length ? b.charCodeAt(i) : 0;
    const xor = ac ^ bc;
    if (xor === 0) continue;
    for (let bit = 7; bit >= 0; bit -= 1) {
      if (((xor >>> bit) & 1) === 1) {
        return i * 8 + (7 - bit);
      }
    }
  }
  return -1;
}

export class PatriciaTrie<V> {
  private root: Node<V> | null = null;
  private count = 0;

  get size(): number {
    return this.count;
  }

  set(key: string, value: V): void {
    if (typeof key !== 'string') throw new TypeError('key must be a string');
    if (!this.root) {
      this.root = { kind: 'leaf', key, value };
      this.count = 1;
      return;
    }
    let cur: Node<V> = this.root;
    while (cur.kind === 'branch') {
      const bit = getBit(key, cur.bitIndex);
      cur = bit === 0 ? cur.left : cur.right;
    }
    if (cur.key === key) {
      cur.value = value;
      return;
    }
    const diffBit = firstDiffBit(key, cur.key);
    const newLeaf: Leaf<V> = { kind: 'leaf', key, value };
    const keyBit = getBit(key, diffBit);
    this.root = this.insertSplice(this.root, diffBit, key, newLeaf, keyBit);
    this.count += 1;
  }

  private insertSplice(
    node: Node<V>,
    diffBit: number,
    key: string,
    newLeaf: Leaf<V>,
    keyBit: 0 | 1,
  ): Node<V> {
    if (node.kind === 'leaf' || node.bitIndex > diffBit) {
      const left: Node<V> = keyBit === 0 ? newLeaf : node;
      const right: Node<V> = keyBit === 0 ? node : newLeaf;
      return { kind: 'branch', bitIndex: diffBit, left, right };
    }
    const bit = getBit(key, node.bitIndex);
    if (bit === 0) node.left = this.insertSplice(node.left, diffBit, key, newLeaf, keyBit);
    else node.right = this.insertSplice(node.right, diffBit, key, newLeaf, keyBit);
    return node;
  }

  get(key: string): V | undefined {
    if (!this.root) return undefined;
    let cur: Node<V> = this.root;
    while (cur.kind === 'branch') {
      const bit = getBit(key, cur.bitIndex);
      cur = bit === 0 ? cur.left : cur.right;
    }
    return cur.key === key ? cur.value : undefined;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  keys(): string[] {
    const out: string[] = [];
    const walk = (n: Node<V> | null): void => {
      if (!n) return;
      if (n.kind === 'leaf') out.push(n.key);
      else {
        walk(n.left);
        walk(n.right);
      }
    };
    walk(this.root);
    return out;
  }
}
