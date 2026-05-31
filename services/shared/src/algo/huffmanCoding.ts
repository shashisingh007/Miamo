// Huffman coding: build a prefix-free code from symbol frequencies, then
// encode/decode strings of symbols. Uses a min-heap by frequency.

export interface HuffmanNode {
  symbol?: string;
  freq: number;
  left?: HuffmanNode;
  right?: HuffmanNode;
}

export interface HuffmanTable {
  tree: HuffmanNode | null;
  codes: Map<string, string>;
}

class MinHeap {
  private a: HuffmanNode[] = [];
  size(): number {
    return this.a.length;
  }
  push(n: HuffmanNode): void {
    this.a.push(n);
    let i = this.a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.a[p].freq <= this.a[i].freq) break;
      [this.a[p], this.a[i]] = [this.a[i], this.a[p]];
      i = p;
    }
  }
  pop(): HuffmanNode {
    const top = this.a[0];
    const last = this.a.pop()!;
    if (this.a.length > 0) {
      this.a[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        let s = i;
        if (l < this.a.length && this.a[l].freq < this.a[s].freq) s = l;
        if (r < this.a.length && this.a[r].freq < this.a[s].freq) s = r;
        if (s === i) break;
        [this.a[s], this.a[i]] = [this.a[i], this.a[s]];
        i = s;
      }
    }
    return top;
  }
}

export function huffmanBuild(freq: Map<string, number>): HuffmanTable {
  if (freq.size === 0) return { tree: null, codes: new Map() };
  const heap = new MinHeap();
  for (const [symbol, f] of freq) {
    if (f <= 0) throw new RangeError('frequencies must be positive');
    heap.push({ symbol, freq: f });
  }
  if (heap.size() === 1) {
    // Single symbol: assign code "0".
    const only = heap.pop();
    return { tree: only, codes: new Map([[only.symbol!, '0']]) };
  }
  while (heap.size() > 1) {
    const a = heap.pop();
    const b = heap.pop();
    heap.push({ freq: a.freq + b.freq, left: a, right: b });
  }
  const tree = heap.pop();
  const codes = new Map<string, string>();
  const walk = (n: HuffmanNode, prefix: string) => {
    if (n.symbol !== undefined) {
      codes.set(n.symbol, prefix);
      return;
    }
    walk(n.left!, prefix + '0');
    walk(n.right!, prefix + '1');
  };
  walk(tree, '');
  return { tree, codes };
}

export function huffmanEncode(symbols: string[], table: HuffmanTable): string {
  let out = '';
  for (const s of symbols) {
    const c = table.codes.get(s);
    if (c === undefined) throw new Error(`symbol not in table: ${s}`);
    out += c;
  }
  return out;
}

export function huffmanDecode(bits: string, table: HuffmanTable): string[] {
  if (!table.tree) {
    if (bits.length > 0) throw new Error('cannot decode with empty table');
    return [];
  }
  // Single-symbol table: every '0' decodes to that symbol.
  if (table.tree.symbol !== undefined) {
    if (!/^0*$/.test(bits)) throw new Error('invalid bit for single-symbol table');
    return new Array<string>(bits.length).fill(table.tree.symbol);
  }
  const out: string[] = [];
  let node: HuffmanNode = table.tree;
  for (const b of bits) {
    node = b === '0' ? node.left! : node.right!;
    if (node.symbol !== undefined) {
      out.push(node.symbol);
      node = table.tree;
    }
  }
  if (node !== table.tree) throw new Error('incomplete bit stream');
  return out;
}
