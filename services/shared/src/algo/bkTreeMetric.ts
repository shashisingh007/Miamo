interface BkNode<T> {
  item: T;
  children: Map<number, BkNode<T>>;
}

export type Metric<T> = (a: T, b: T) => number;

export class BkTreeMetric<T> {
  private root: BkNode<T> | null = null;
  private count = 0;
  private readonly metric: Metric<T>;

  constructor(metric: Metric<T>) {
    this.metric = metric;
  }

  get size(): number {
    return this.count;
  }

  add(item: T): void {
    if (!this.root) {
      this.root = { item, children: new Map() };
      this.count = 1;
      return;
    }
    let node = this.root;
    for (;;) {
      const d = this.metric(item, node.item);
      if (!Number.isFinite(d) || d < 0) throw new TypeError('metric must return a non-negative number');
      const child = node.children.get(d);
      if (!child) {
        node.children.set(d, { item, children: new Map() });
        this.count += 1;
        return;
      }
      node = child;
    }
  }

  search(query: T, threshold: number): { item: T; distance: number }[] {
    if (!Number.isFinite(threshold) || threshold < 0) {
      throw new RangeError('threshold must be a non-negative finite number');
    }
    const out: { item: T; distance: number }[] = [];
    if (!this.root) return out;
    const stack: BkNode<T>[] = [this.root];
    while (stack.length > 0) {
      const node = stack.pop()!;
      const d = this.metric(query, node.item);
      if (d <= threshold) out.push({ item: node.item, distance: d });
      const lo = d - threshold;
      const hi = d + threshold;
      for (const [edge, child] of node.children) {
        if (edge >= lo && edge <= hi) stack.push(child);
      }
    }
    return out.sort((a, b) => a.distance - b.distance);
  }
}

export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) throw new RangeError('strings must have equal length');
  let d = 0;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) d += 1;
  return d;
}
