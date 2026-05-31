export interface TopologicalSortResult {
  order: number[];
  hasCycle: boolean;
}

export function topologicalSort(graph: number[][]): TopologicalSortResult {
  const n = graph.length;
  const indeg = new Array<number>(n).fill(0);
  for (let u = 0; u < n; u++) {
    for (const v of graph[u]) {
      if (v < 0 || v >= n) throw new RangeError(`edge target ${v} out of bounds`);
      indeg[v] += 1;
    }
  }
  const queue: number[] = [];
  for (let i = 0; i < n; i++) if (indeg[i] === 0) queue.push(i);
  const order: number[] = [];
  let head = 0;
  while (head < queue.length) {
    const u = queue[head++];
    order.push(u);
    for (const v of graph[u]) {
      indeg[v] -= 1;
      if (indeg[v] === 0) queue.push(v);
    }
  }
  return { order, hasCycle: order.length !== n };
}
