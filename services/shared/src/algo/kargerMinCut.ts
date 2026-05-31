// Karger's randomized min-cut: repeatedly contract random edges until 2 vertices
// remain; the surviving edge multiplicity is a cut. With trials = C * n^2 * log n
// the global min cut is found with high probability. We expose a single-trial
// `kargerMinCutOnce` and a `kargerMinCut` that runs multiple trials.

export interface KargerEdge {
  u: number;
  v: number;
}

export interface KargerResult {
  cut: number;
  partition: [number[], number[]];
}

class DSU {
  private parent: number[];
  private rank: number[];
  private members: number[][];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
    this.members = Array.from({ length: n }, (_, i) => [i]);
  }
  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }
  union(a: number, b: number): boolean {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return false;
    if (this.rank[ra] < this.rank[rb]) {
      this.parent[ra] = rb;
      this.members[rb].push(...this.members[ra]);
      this.members[ra] = [];
    } else if (this.rank[ra] > this.rank[rb]) {
      this.parent[rb] = ra;
      this.members[ra].push(...this.members[rb]);
      this.members[rb] = [];
    } else {
      this.parent[rb] = ra;
      this.members[ra].push(...this.members[rb]);
      this.members[rb] = [];
      this.rank[ra] += 1;
    }
    return true;
  }
  groups(): [number[], number[]] {
    const seen = new Map<number, number[]>();
    for (let i = 0; i < this.parent.length; i += 1) {
      const r = this.find(i);
      const arr = seen.get(r);
      if (arr) arr.push(i);
      else seen.set(r, [i]);
    }
    const vals = Array.from(seen.values());
    if (vals.length !== 2) throw new Error('expected 2 groups');
    return [vals[0], vals[1]];
  }
}

function kargerMinCutOnce(
  vertices: number,
  edges: KargerEdge[],
  rng: () => number,
): KargerResult {
  if (vertices < 2) throw new RangeError('need >= 2 vertices');
  const dsu = new DSU(vertices);
  let remaining = vertices;
  // shuffle edge order
  const order: number[] = [];
  for (let i = 0; i < edges.length; i += 1) order.push(i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const t = order[i];
    order[i] = order[j];
    order[j] = t;
  }
  let idx = 0;
  while (remaining > 2 && idx < order.length) {
    const e = edges[order[idx]];
    idx += 1;
    if (dsu.union(e.u, e.v)) remaining -= 1;
  }
  if (remaining > 2) throw new RangeError('graph not connected enough to contract to 2');
  let cut = 0;
  for (const e of edges) {
    if (dsu.find(e.u) !== dsu.find(e.v)) cut += 1;
  }
  return { cut, partition: dsu.groups() };
}

export interface KargerOptions {
  rng?: () => number;
  trials?: number;
}

export function kargerMinCut(
  vertices: number,
  edges: KargerEdge[],
  options: KargerOptions = {},
): KargerResult {
  if (!Number.isInteger(vertices) || vertices < 2) {
    throw new RangeError('vertices must be an integer >= 2');
  }
  for (const e of edges) {
    if (
      !Number.isInteger(e.u) ||
      !Number.isInteger(e.v) ||
      e.u < 0 ||
      e.v < 0 ||
      e.u >= vertices ||
      e.v >= vertices ||
      e.u === e.v
    ) {
      throw new RangeError('invalid edge');
    }
  }
  const rng = options.rng ?? Math.random;
  const defaultTrials = Math.max(20, vertices * vertices);
  const trials = options.trials ?? defaultTrials;
  if (!Number.isInteger(trials) || trials < 1) {
    throw new RangeError('trials must be a positive integer');
  }
  let best: KargerResult | null = null;
  for (let t = 0; t < trials; t += 1) {
    const r = kargerMinCutOnce(vertices, edges, rng);
    if (best === null || r.cut < best.cut) best = r;
  }
  return best!;
}
