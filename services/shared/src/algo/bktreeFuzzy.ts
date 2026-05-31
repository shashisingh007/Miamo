export interface BkTreeNode<T> {
  value: T;
  children: Map<number, BkTreeNode<T>>;
}

export class BkTreeFuzzy<T = string> {
  private root: BkTreeNode<T> | null = null;
  private _size = 0;

  constructor(private readonly distance: (a: T, b: T) => number = defaultLevenshtein as unknown as (a: T, b: T) => number) {}

  insert(value: T): void {
    if (this.root === null) {
      this.root = { value, children: new Map() };
      this._size = 1;
      return;
    }
    let node = this.root;
    while (true) {
      const d = this.distance(value, node.value);
      if (d === 0) return; // duplicate
      const child = node.children.get(d);
      if (child === undefined) {
        node.children.set(d, { value, children: new Map() });
        this._size += 1;
        return;
      }
      node = child;
    }
  }

  search(query: T, maxDistance: number): Array<{ value: T; distance: number }> {
    if (maxDistance < 0) throw new Error('BkTreeFuzzy: maxDistance must be >= 0');
    const results: Array<{ value: T; distance: number }> = [];
    if (this.root === null) return results;
    const stack: BkTreeNode<T>[] = [this.root];
    while (stack.length > 0) {
      const node = stack.pop()!;
      const d = this.distance(query, node.value);
      if (d <= maxDistance) results.push({ value: node.value, distance: d });
      const lo = d - maxDistance;
      const hi = d + maxDistance;
      for (const [edge, child] of node.children) {
        if (edge >= lo && edge <= hi) stack.push(child);
      }
    }
    results.sort((a, b) => a.distance - b.distance);
    return results;
  }

  size(): number {
    return this._size;
  }
}

export function bktreeFuzzy<T = string>(distance?: (a: T, b: T) => number): BkTreeFuzzy<T> {
  return new BkTreeFuzzy<T>(distance);
}

function defaultLevenshtein(a: string, b: string): number {
  if (typeof a !== 'string' || typeof b !== 'string') {
    throw new Error('bktreeFuzzy default distance only supports strings; pass a custom distance');
  }
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j += 1) prev[j] = j;
  for (let i = 1; i <= m; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}
