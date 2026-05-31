interface Node<K, V> {
  key: K;
  value: V;
  left: Node<K, V> | null;
  right: Node<K, V> | null;
}

type Compare<K> = (a: K, b: K) => number;

function defaultCompare<K>(a: K, b: K): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function rotateRight<K, V>(p: Node<K, V>): Node<K, V> {
  const l = p.left!;
  p.left = l.right;
  l.right = p;
  return l;
}

function rotateLeft<K, V>(p: Node<K, V>): Node<K, V> {
  const r = p.right!;
  p.right = r.left;
  r.left = p;
  return r;
}

function splay<K, V>(root: Node<K, V> | null, key: K, cmp: Compare<K>): Node<K, V> | null {
  if (!root) return null;
  const N: Node<K, V> = { key: undefined as any, value: undefined as any, left: null, right: null };
  let leftMax: Node<K, V> = N;
  let rightMin: Node<K, V> = N;
  let cur: Node<K, V> = root;
  for (;;) {
    const c = cmp(key, cur.key);
    if (c < 0) {
      if (!cur.left) break;
      if (cmp(key, cur.left.key) < 0) {
        cur = rotateRight(cur);
        if (!cur.left) break;
      }
      rightMin.left = cur;
      rightMin = cur;
      cur = cur.left!;
      rightMin.left = null;
    } else if (c > 0) {
      if (!cur.right) break;
      if (cmp(key, cur.right.key) > 0) {
        cur = rotateLeft(cur);
        if (!cur.right) break;
      }
      leftMax.right = cur;
      leftMax = cur;
      cur = cur.right!;
      leftMax.right = null;
    } else {
      break;
    }
  }
  leftMax.right = cur.left;
  rightMin.left = cur.right;
  cur.left = N.right;
  cur.right = N.left;
  return cur;
}

export class SplayTreeMap<K, V> {
  private root: Node<K, V> | null = null;
  private count = 0;
  private readonly cmp: Compare<K>;

  constructor(compare?: Compare<K>) {
    this.cmp = compare ?? defaultCompare;
  }

  get size(): number {
    return this.count;
  }

  set(key: K, value: V): void {
    if (!this.root) {
      this.root = { key, value, left: null, right: null };
      this.count = 1;
      return;
    }
    this.root = splay(this.root, key, this.cmp);
    const c = this.cmp(key, this.root!.key);
    if (c === 0) {
      this.root!.value = value;
      return;
    }
    const node: Node<K, V> = { key, value, left: null, right: null };
    if (c < 0) {
      node.right = this.root;
      node.left = this.root!.left;
      this.root!.left = null;
    } else {
      node.left = this.root;
      node.right = this.root!.right;
      this.root!.right = null;
    }
    this.root = node;
    this.count += 1;
  }

  get(key: K): V | undefined {
    if (!this.root) return undefined;
    this.root = splay(this.root, key, this.cmp);
    return this.cmp(key, this.root!.key) === 0 ? this.root!.value : undefined;
  }

  has(key: K): boolean {
    if (!this.root) return false;
    this.root = splay(this.root, key, this.cmp);
    return this.cmp(key, this.root!.key) === 0;
  }

  delete(key: K): boolean {
    if (!this.root) return false;
    this.root = splay(this.root, key, this.cmp);
    if (this.cmp(key, this.root!.key) !== 0) return false;
    const left = this.root!.left;
    const right = this.root!.right;
    if (!left) {
      this.root = right;
    } else {
      this.root = splay(left, key, this.cmp);
      this.root!.right = right;
    }
    this.count -= 1;
    return true;
  }

  keys(): K[] {
    const out: K[] = [];
    const walk = (n: Node<K, V> | null): void => {
      if (!n) return;
      walk(n.left);
      out.push(n.key);
      walk(n.right);
    };
    walk(this.root);
    return out;
  }
}
