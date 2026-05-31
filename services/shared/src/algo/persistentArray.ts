type Slot<V> = { kind: 'leaf'; value: V } | { kind: 'node'; children: (Slot<V> | null)[] };

const FANOUT = 4;
const LOG = 2;
const MASK = FANOUT - 1;

function shiftFor(depth: number, height: number): number {
  return (height - 1 - depth) * LOG;
}

function setAt<V>(node: Slot<V> | null, idx: number, depth: number, height: number, value: V): Slot<V> {
  if (depth === height) {
    return { kind: 'leaf', value };
  }
  const children: (Slot<V> | null)[] =
    node && node.kind === 'node' ? node.children.slice() : new Array(FANOUT).fill(null);
  const sub = (idx >>> shiftFor(depth, height)) & MASK;
  children[sub] = setAt(children[sub] ?? null, idx, depth + 1, height, value);
  return { kind: 'node', children };
}

function readAt<V>(node: Slot<V> | null, idx: number, depth: number, height: number): V | undefined {
  if (!node) return undefined;
  if (depth === height) return node.kind === 'leaf' ? node.value : undefined;
  if (node.kind !== 'node') return undefined;
  const sub = (idx >>> shiftFor(depth, height)) & MASK;
  return readAt(node.children[sub], idx, depth + 1, height);
}

function neededHeight(idx: number): number {
  let h = 1;
  while ((1 << (h * LOG)) <= idx) h += 1;
  return h;
}

function reroot<V>(root: Slot<V> | null, fromH: number, toH: number): Slot<V> | null {
  if (!root) return null;
  let cur: Slot<V> = root;
  for (let h = fromH; h < toH; h += 1) {
    const children: (Slot<V> | null)[] = new Array(FANOUT).fill(null);
    children[0] = cur;
    cur = { kind: 'node', children };
  }
  return cur;
}

export class PersistentArray<V> {
  constructor(
    private readonly root: Slot<V> | null = null,
    private readonly height: number = 1,
    public readonly length: number = 0,
  ) {}

  set(idx: number, value: V): PersistentArray<V> {
    if (!Number.isInteger(idx) || idx < 0) {
      throw new RangeError('idx must be a non-negative integer');
    }
    const targetH = Math.max(this.height, neededHeight(idx));
    const rerootedRoot = reroot(this.root, this.height, targetH);
    const newRoot = setAt(rerootedRoot, idx, 0, targetH, value);
    const newLength = Math.max(this.length, idx + 1);
    return new PersistentArray<V>(newRoot, targetH, newLength);
  }

  get(idx: number): V | undefined {
    if (!Number.isInteger(idx) || idx < 0) return undefined;
    if ((1 << (this.height * LOG)) <= idx) return undefined;
    return readAt(this.root, idx, 0, this.height);
  }
}
