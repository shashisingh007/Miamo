// 2-3 finger tree with persistent O(1) amortized cons/snoc/head/tail/init/last.
// Simplified version: deep tree is recursively the same structure over Node<T>.

type Digit<T> = [T] | [T, T] | [T, T, T] | [T, T, T, T];
type Node<T> = { kind: 'n2'; a: T; b: T } | { kind: 'n3'; a: T; b: T; c: T };

type Tree<T> =
  | { kind: 'empty' }
  | { kind: 'single'; x: T }
  | { kind: 'deep'; prefix: Digit<T>; deeper: Tree<Node<T>>; suffix: Digit<T> };

function empty<T>(): Tree<T> {
  return { kind: 'empty' };
}

function single<T>(x: T): Tree<T> {
  return { kind: 'single', x };
}

function deep<T>(prefix: Digit<T>, deeper: Tree<Node<T>>, suffix: Digit<T>): Tree<T> {
  return { kind: 'deep', prefix, deeper, suffix };
}

function cons<T>(x: T, t: Tree<T>): Tree<T> {
  if (t.kind === 'empty') return single(x);
  if (t.kind === 'single') return deep([x], empty(), [t.x]);
  const p = t.prefix;
  if (p.length < 4) {
    const newPrefix = [x, ...p] as Digit<T>;
    return deep(newPrefix, t.deeper, t.suffix);
  }
  // overflow: push 3 elements down as a node
  const node: Node<T> = { kind: 'n3', a: p[1], b: p[2], c: p[3] };
  return deep([x, p[0]], cons(node, t.deeper), t.suffix);
}

function snoc<T>(t: Tree<T>, x: T): Tree<T> {
  if (t.kind === 'empty') return single(x);
  if (t.kind === 'single') return deep([t.x], empty(), [x]);
  const s = t.suffix;
  if (s.length < 4) {
    const newSuffix = [...s, x] as Digit<T>;
    return deep(t.prefix, t.deeper, newSuffix);
  }
  const node: Node<T> = { kind: 'n3', a: s[0], b: s[1], c: s[2] };
  return deep(t.prefix, snoc(t.deeper, node), [s[3], x]);
}

function head<T>(t: Tree<T>): T | undefined {
  if (t.kind === 'empty') return undefined;
  if (t.kind === 'single') return t.x;
  return t.prefix[0];
}

function last<T>(t: Tree<T>): T | undefined {
  if (t.kind === 'empty') return undefined;
  if (t.kind === 'single') return t.x;
  return t.suffix[t.suffix.length - 1];
}

function toArray<T>(t: Tree<T>): T[] {
  if (t.kind === 'empty') return [];
  if (t.kind === 'single') return [t.x];
  const nodes = toArray(t.deeper);
  const out: T[] = [...t.prefix];
  for (const n of nodes) {
    if (n.kind === 'n2') out.push(n.a, n.b);
    else out.push(n.a, n.b, n.c);
  }
  for (const v of t.suffix) out.push(v);
  return out;
}

export class FingerTreeSequence<T> {
  private constructor(private readonly tree: Tree<T>, public readonly length: number) {}

  static empty<T>(): FingerTreeSequence<T> {
    return new FingerTreeSequence<T>(empty<T>(), 0);
  }

  static fromArray<T>(values: T[]): FingerTreeSequence<T> {
    let t: Tree<T> = empty<T>();
    for (const v of values) t = snoc(t, v);
    return new FingerTreeSequence<T>(t, values.length);
  }

  cons(x: T): FingerTreeSequence<T> {
    return new FingerTreeSequence<T>(cons(x, this.tree), this.length + 1);
  }

  snoc(x: T): FingerTreeSequence<T> {
    return new FingerTreeSequence<T>(snoc(this.tree, x), this.length + 1);
  }

  head(): T | undefined {
    return head(this.tree);
  }

  last(): T | undefined {
    return last(this.tree);
  }

  isEmpty(): boolean {
    return this.tree.kind === 'empty';
  }

  toArray(): T[] {
    return toArray(this.tree);
  }
}
