export interface PrimEdge {
  to: number;
  weight: number;
}

export interface PrimMSTResultEdge {
  from: number;
  to: number;
  weight: number;
}

export interface PrimMSTResult {
  mst: PrimMSTResultEdge[];
  totalWeight: number;
  connected: boolean;
}

class MinHeap<T> {
  private heap: Array<[number, T]> = [];
  size(): number { return this.heap.length; }
  push(item: [number, T]): void {
    this.heap.push(item);
    this.up(this.heap.length - 1);
  }
  pop(): [number, T] | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) { this.heap[0] = last; this.down(0); }
    return top;
  }
  private up(i: number): void {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.heap[i][0] < this.heap[p][0]) {
        [this.heap[i], this.heap[p]] = [this.heap[p], this.heap[i]];
        i = p;
      } else break;
    }
  }
  private down(i: number): void {
    const n = this.heap.length;
    while (true) {
      const l = 2 * i + 1, r = 2 * i + 2;
      let s = i;
      if (l < n && this.heap[l][0] < this.heap[s][0]) s = l;
      if (r < n && this.heap[r][0] < this.heap[s][0]) s = r;
      if (s !== i) { [this.heap[i], this.heap[s]] = [this.heap[s], this.heap[i]]; i = s; }
      else break;
    }
  }
}

export function primMST(graph: PrimEdge[][]): PrimMSTResult {
  const n = graph.length;
  if (n === 0) return { mst: [], totalWeight: 0, connected: true };
  const inMST = new Array<boolean>(n).fill(false);
  const parent = new Array<number>(n).fill(-1);
  const minEdge = new Array<number>(n).fill(Infinity);
  minEdge[0] = 0;
  const heap = new MinHeap<number>();
  heap.push([0, 0]);
  let visited = 0;
  while (heap.size() > 0) {
    const [w, u] = heap.pop()!;
    if (inMST[u]) continue;
    inMST[u] = true;
    visited += 1;
    if (w !== minEdge[u]) continue;
    for (const e of graph[u]) {
      if (e.to < 0 || e.to >= n) throw new RangeError(`edge target ${e.to} out of bounds`);
      if (!inMST[e.to] && e.weight < minEdge[e.to]) {
        minEdge[e.to] = e.weight;
        parent[e.to] = u;
        heap.push([e.weight, e.to]);
      }
    }
  }
  const mst: PrimMSTResultEdge[] = [];
  let total = 0;
  for (let v = 1; v < n; v++) {
    if (parent[v] !== -1) {
      mst.push({ from: parent[v], to: v, weight: minEdge[v] });
      total += minEdge[v];
    }
  }
  return { mst, totalWeight: total, connected: visited === n };
}
