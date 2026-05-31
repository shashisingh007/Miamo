// Probabilistic skip-list set with O(log n) expected insert/contains/delete.

interface SkipNode<T> {
  value: T;
  forward: Array<SkipNode<T> | null>;
}

export interface SkipListSetOptions<T> {
  compare?: (a: T, b: T) => number;
  maxLevel?: number;
  probability?: number;
  random?: () => number;
}

export class SkipListSet<T> {
  private readonly head: SkipNode<T>;
  private readonly cmp: (a: T, b: T) => number;
  private readonly maxLevel: number;
  private readonly p: number;
  private readonly rng: () => number;
  private level = 1;
  private count = 0;

  constructor(opts: SkipListSetOptions<T> = {}) {
    this.cmp = opts.compare ?? ((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    this.maxLevel = opts.maxLevel ?? 16;
    if (!Number.isInteger(this.maxLevel) || this.maxLevel < 1) {
      throw new Error('maxLevel must be a positive integer');
    }
    this.p = opts.probability ?? 0.5;
    if (!Number.isFinite(this.p) || this.p <= 0 || this.p >= 1) {
      throw new Error('probability must be in (0, 1)');
    }
    this.rng = opts.random ?? Math.random;
    this.head = {
      value: undefined as unknown as T,
      forward: new Array(this.maxLevel).fill(null),
    };
  }

  get size(): number {
    return this.count;
  }

  private randomLevel(): number {
    let lvl = 1;
    while (this.rng() < this.p && lvl < this.maxLevel) lvl++;
    return lvl;
  }

  has(value: T): boolean {
    let node: SkipNode<T> = this.head;
    for (let i = this.level - 1; i >= 0; i--) {
      while (node.forward[i] && this.cmp(node.forward[i]!.value, value) < 0) {
        node = node.forward[i]!;
      }
    }
    const next = node.forward[0];
    return !!next && this.cmp(next.value, value) === 0;
  }

  add(value: T): boolean {
    const update: Array<SkipNode<T>> = new Array(this.maxLevel).fill(this.head);
    let node: SkipNode<T> = this.head;
    for (let i = this.level - 1; i >= 0; i--) {
      while (node.forward[i] && this.cmp(node.forward[i]!.value, value) < 0) {
        node = node.forward[i]!;
      }
      update[i] = node;
    }
    const cand = node.forward[0];
    if (cand && this.cmp(cand.value, value) === 0) return false;
    const lvl = this.randomLevel();
    if (lvl > this.level) {
      for (let i = this.level; i < lvl; i++) update[i] = this.head;
      this.level = lvl;
    }
    const newNode: SkipNode<T> = { value, forward: new Array(lvl).fill(null) };
    for (let i = 0; i < lvl; i++) {
      newNode.forward[i] = update[i].forward[i];
      update[i].forward[i] = newNode;
    }
    this.count++;
    return true;
  }

  delete(value: T): boolean {
    const update: Array<SkipNode<T>> = new Array(this.maxLevel).fill(this.head);
    let node: SkipNode<T> = this.head;
    for (let i = this.level - 1; i >= 0; i--) {
      while (node.forward[i] && this.cmp(node.forward[i]!.value, value) < 0) {
        node = node.forward[i]!;
      }
      update[i] = node;
    }
    const target = node.forward[0];
    if (!target || this.cmp(target.value, value) !== 0) return false;
    for (let i = 0; i < this.level; i++) {
      if (update[i].forward[i] !== target) break;
      update[i].forward[i] = target.forward[i];
    }
    while (this.level > 1 && this.head.forward[this.level - 1] === null) this.level--;
    this.count--;
    return true;
  }

  *values(): IterableIterator<T> {
    let node = this.head.forward[0];
    while (node) {
      yield node.value;
      node = node.forward[0];
    }
  }

  toArray(): T[] {
    return Array.from(this.values());
  }
}
