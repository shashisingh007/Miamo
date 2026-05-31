export interface DijkstraEdge {
  to: number;
  weight: number;
}

export interface DijkstraResult {
  dist: number[];
  prev: Array<number | null>;
}

class MinHeap {
  private heap: Array<[number, number]> = [];
  size(): number { return this.heap.length; }
  push(item: [number, number]): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }
  pop(): [number, number] | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.sinkDown(0);
    }
    return top;
  }
  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heap[i][0] < this.heap[parent][0]) {
        [this.heap[i], this.heap[parent]] = [this.heap[parent], this.heap[i]];
        i = parent;
      } else break;
    }
  }
  private sinkDown(i: number): void {
    const n = this.heap.length;
    while (true) {
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      let smallest = i;
      if (l < n && this.heap[l][0] < this.heap[smallest][0]) smallest = l;
      if (r < n && this.heap[r][0] < this.heap[smallest][0]) smallest = r;
      if (smallest !== i) {
        [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
        i = smallest;
      } else break;
    }
  }
}

export function dijkstraShortestPath(
  graph: DijkstraEdge[][],
  source: number
): DijkstraResult {
  const n = graph.length;
  if (source < 0 || source >= n) throw new RangeError('source out of bounds');
  const dist = new Array<number>(n).fill(Infinity);
  const prev = new Array<number | null>(n).fill(null);
  dist[source] = 0;
  const heap = new MinHeap();
  heap.push([0, source]);
  while (heap.size() > 0) {
    const [d, u] = heap.pop()!;
    if (d > dist[u]) continue;
    for (const e of graph[u]) {
      if (e.weight < 0) throw new RangeError('negative edge weight');
      const alt = d + e.weight;
      if (alt < dist[e.to]) {
        dist[e.to] = alt;
        prev[e.to] = u;
        heap.push([alt, e.to]);
      }
    }
  }
  return { dist, prev };
}

export function reconstructPath(prev: Array<number | null>, target: number): number[] {
  const path: number[] = [];
  let cur: number | null = target;
  while (cur !== null) {
    path.unshift(cur);
    cur = prev[cur];
  }
  return path;
}
