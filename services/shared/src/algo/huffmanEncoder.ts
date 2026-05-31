interface Node {
  symbol: string | null;
  freq: number;
  left: Node | null;
  right: Node | null;
}

function buildFrequencyTable(input: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const ch of input) m.set(ch, (m.get(ch) ?? 0) + 1);
  return m;
}

function buildTree(freq: Map<string, number>): Node | null {
  const heap: Node[] = [];
  for (const [symbol, f] of freq) {
    heap.push({ symbol, freq: f, left: null, right: null });
  }
  if (heap.length === 0) return null;
  if (heap.length === 1) {
    const only = heap[0];
    return { symbol: null, freq: only.freq, left: only, right: null };
  }
  const cmp = (a: Node, b: Node): number => a.freq - b.freq;
  while (heap.length > 1) {
    heap.sort(cmp);
    const a = heap.shift()!;
    const b = heap.shift()!;
    heap.push({ symbol: null, freq: a.freq + b.freq, left: a, right: b });
  }
  return heap[0];
}

function buildCodes(root: Node | null): Map<string, string> {
  const codes = new Map<string, string>();
  if (root === null) return codes;
  const walk = (n: Node, prefix: string): void => {
    if (n.symbol !== null) {
      codes.set(n.symbol, prefix.length === 0 ? '0' : prefix);
      return;
    }
    if (n.left) walk(n.left, prefix + '0');
    if (n.right) walk(n.right, prefix + '1');
  };
  walk(root, '');
  return codes;
}

export interface HuffmanEncoded {
  bits: string;
  codes: Map<string, string>;
}

export function huffmanEncode(input: string): HuffmanEncoded {
  const freq = buildFrequencyTable(input);
  const tree = buildTree(freq);
  const codes = buildCodes(tree);
  let bits = '';
  for (const ch of input) bits += codes.get(ch) ?? '';
  return { bits, codes };
}

export function huffmanDecode(bits: string, codes: Map<string, string>): string {
  const inverse = new Map<string, string>();
  for (const [sym, code] of codes) inverse.set(code, sym);
  let out = '';
  let buf = '';
  for (const b of bits) {
    buf += b;
    const sym = inverse.get(buf);
    if (sym !== undefined) {
      out += sym;
      buf = '';
    }
  }
  return out;
}
