// Kahn's algorithm for topological sort of a DAG using in-degree BFS.
// Returns the topological order, or null if the graph contains a cycle.
// Ties are broken by smallest node id first (deterministic).

export function kahnsTopologicalSort(n: number, edges: ReadonlyArray<[number, number]>): number[] | null {
  if (!Number.isInteger(n) || n < 0) throw new Error('kahnsTopologicalSort: n must be non-negative integer');
  const adj: number[][] = Array.from({ length: n }, () => []);
  const inDeg = new Array<number>(n).fill(0);
  for (const [u, v] of edges) {
    if (u < 0 || u >= n || v < 0 || v >= n) throw new Error('kahnsTopologicalSort: bad edge endpoint');
    adj[u].push(v);
    inDeg[v] += 1;
  }
  // simple binary-heap based selection for deterministic smallest-first order
  const heap: number[] = [];
  const heapPush = (x: number): void => {
    heap.push(x);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent] > heap[i]) {
        [heap[parent], heap[i]] = [heap[i], heap[parent]];
        i = parent;
      } else break;
    }
  };
  const heapPop = (): number => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      while (true) {
        const l = i * 2 + 1;
        const r = i * 2 + 2;
        let best = i;
        if (l < heap.length && heap[l] < heap[best]) best = l;
        if (r < heap.length && heap[r] < heap[best]) best = r;
        if (best === i) break;
        [heap[best], heap[i]] = [heap[i], heap[best]];
        i = best;
      }
    }
    return top;
  };

  for (let v = 0; v < n; v += 1) if (inDeg[v] === 0) heapPush(v);
  const out: number[] = [];
  while (heap.length) {
    const u = heapPop();
    out.push(u);
    for (const v of adj[u]) {
      inDeg[v] -= 1;
      if (inDeg[v] === 0) heapPush(v);
    }
  }
  return out.length === n ? out : null;
}
