interface TreapNode<T> {
  key: T;
  priority: number;
  left: TreapNode<T> | null;
  right: TreapNode<T> | null;
  size: number;
}

function size<T>(n: TreapNode<T> | null): number {
  return n === null ? 0 : n.size;
}

function update<T>(n: TreapNode<T>): void {
  n.size = 1 + size(n.left) + size(n.right);
}

function rotateRight<T>(n: TreapNode<T>): TreapNode<T> {
  const l = n.left!;
  n.left = l.right;
  l.right = n;
  update(n);
  update(l);
  return l;
}

function rotateLeft<T>(n: TreapNode<T>): TreapNode<T> {
  const r = n.right!;
  n.right = r.left;
  r.left = n;
  update(n);
  update(r);
  return r;
}

export interface TreapOrderedSet<T> {
  size(): number;
  has(value: T): boolean;
  add(value: T): boolean;
  delete(value: T): boolean;
  rank(value: T): number;
  kth(k: number): T | undefined;
  values(): T[];
}

export function createTreapOrderedSet<T>(
  compare: (a: T, b: T) => number,
  rng: () => number = Math.random
): TreapOrderedSet<T> {
  let root: TreapNode<T> | null = null;
  let count = 0;

  const insert = (node: TreapNode<T> | null, value: T): { node: TreapNode<T>; added: boolean } => {
    if (node === null) {
      return {
        node: { key: value, priority: rng(), left: null, right: null, size: 1 },
        added: true,
      };
    }
    const cmp = compare(value, node.key);
    if (cmp === 0) return { node, added: false };
    if (cmp < 0) {
      const sub = insert(node.left, value);
      node.left = sub.node;
      update(node);
      if (node.left && node.left.priority > node.priority) {
        return { node: rotateRight(node), added: sub.added };
      }
      return { node, added: sub.added };
    } else {
      const sub = insert(node.right, value);
      node.right = sub.node;
      update(node);
      if (node.right && node.right.priority > node.priority) {
        return { node: rotateLeft(node), added: sub.added };
      }
      return { node, added: sub.added };
    }
  };

  const remove = (node: TreapNode<T> | null, value: T): { node: TreapNode<T> | null; removed: boolean } => {
    if (node === null) return { node: null, removed: false };
    const cmp = compare(value, node.key);
    if (cmp < 0) {
      const sub = remove(node.left, value);
      node.left = sub.node;
      update(node);
      return { node, removed: sub.removed };
    }
    if (cmp > 0) {
      const sub = remove(node.right, value);
      node.right = sub.node;
      update(node);
      return { node, removed: sub.removed };
    }
    if (node.left === null && node.right === null) return { node: null, removed: true };
    if (node.left === null) return { node: node.right, removed: true };
    if (node.right === null) return { node: node.left, removed: true };
    let rotated: TreapNode<T>;
    if (node.left.priority > node.right.priority) rotated = rotateRight(node);
    else rotated = rotateLeft(node);
    if (rotated.right === node) {
      const sub = remove(rotated.right, value);
      rotated.right = sub.node;
      update(rotated);
      return { node: rotated, removed: sub.removed };
    } else {
      const sub = remove(rotated.left, value);
      rotated.left = sub.node;
      update(rotated);
      return { node: rotated, removed: sub.removed };
    }
  };

  const has = (node: TreapNode<T> | null, value: T): boolean => {
    while (node !== null) {
      const cmp = compare(value, node.key);
      if (cmp === 0) return true;
      node = cmp < 0 ? node.left : node.right;
    }
    return false;
  };

  const rank = (node: TreapNode<T> | null, value: T): number => {
    let count = 0;
    while (node !== null) {
      const cmp = compare(value, node.key);
      if (cmp <= 0) node = node.left;
      else { count += 1 + size(node.left); node = node.right; }
    }
    return count;
  };

  const kth = (node: TreapNode<T> | null, k: number): T | undefined => {
    while (node !== null) {
      const ls = size(node.left);
      if (k === ls) return node.key;
      if (k < ls) node = node.left;
      else { k -= ls + 1; node = node.right; }
    }
    return undefined;
  };

  const inorder = (node: TreapNode<T> | null, out: T[]): void => {
    if (node === null) return;
    inorder(node.left, out);
    out.push(node.key);
    inorder(node.right, out);
  };

  return {
    size: () => count,
    has: (value: T) => has(root, value),
    add: (value: T) => {
      const r = insert(root, value);
      root = r.node;
      if (r.added) count += 1;
      return r.added;
    },
    delete: (value: T) => {
      const r = remove(root, value);
      root = r.node;
      if (r.removed) count -= 1;
      return r.removed;
    },
    rank: (value: T) => rank(root, value),
    kth: (k: number) => kth(root, k),
    values: () => {
      const out: T[] = [];
      inorder(root, out);
      return out;
    },
  };
}
