export interface AStarEdge {
  to: number;
  cost: number;
}

export interface AStarResult {
  path: number[];
  cost: number;
}

class MinHeap {
  private heap: Array<[number, number]> = [];
  size(): number { return this.heap.length; }
  push(item: [number, number]): void {
    this.heap.push(item);
    this.up(this.heap.length - 1);
  }
  pop(): [number, number] | undefined {
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

export function aStarPathfind(
  graph: AStarEdge[][],
  start: number,
  goal: number,
  heuristic: (node: number) => number
): AStarResult | null {
  const n = graph.length;
  if (n === 0) return null;
  if (start < 0 || start >= n || goal < 0 || goal >= n) {
    throw new RangeError('start/goal out of bounds');
  }
  if (start === goal) return { path: [start], cost: 0 };
  const gScore = new Array<number>(n).fill(Infinity);
  const cameFrom = new Array<number>(n).fill(-1);
  gScore[start] = 0;
  const open = new MinHeap();
  open.push([heuristic(start), start]);
  const closed = new Array<boolean>(n).fill(false);
  while (open.size() > 0) {
    const [, current] = open.pop()!;
    if (closed[current]) continue;
    if (current === goal) {
      const path: number[] = [];
      let cur = goal;
      while (cur !== -1) { path.unshift(cur); cur = cameFrom[cur]; }
      return { path, cost: gScore[goal] };
    }
    closed[current] = true;
    for (const e of graph[current]) {
      if (e.cost < 0) throw new RangeError('negative edge cost');
      if (e.to < 0 || e.to >= n) throw new RangeError(`edge target ${e.to} out of bounds`);
      if (closed[e.to]) continue;
      const tentative = gScore[current] + e.cost;
      if (tentative < gScore[e.to]) {
        cameFrom[e.to] = current;
        gScore[e.to] = tentative;
        const h = heuristic(e.to);
        if (h < 0) throw new RangeError('heuristic must be non-negative');
        open.push([tentative + h, e.to]);
      }
    }
  }
  return null;
}
