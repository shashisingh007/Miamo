/**
 * Kahn's topological sort for a DAG. Nodes are 0..n-1.
 * adj[u] = list of nodes v such that edge u -> v.
 * Returns a topological ordering. Throws on cycle.
 */
export function kahnTopologicalSort(n: number, adj: number[][]): number[] {
  if (!Number.isInteger(n) || n < 0) throw new Error('kahnTopologicalSort: bad n');
  if (!Array.isArray(adj)) throw new Error('kahnTopologicalSort: adj must be array');
  if (adj.length !== n) throw new Error('kahnTopologicalSort: adj length mismatch');
  const indeg = new Array(n).fill(0);
  for (let u = 0; u < n; u++) {
    if (!Array.isArray(adj[u])) throw new Error('kahnTopologicalSort: adj[u] must be array');
    for (const v of adj[u]) {
      if (!Number.isInteger(v) || v < 0 || v >= n) {
        throw new Error('kahnTopologicalSort: edge target out of range');
      }
      indeg[v]++;
    }
  }
  const queue: number[] = [];
  for (let u = 0; u < n; u++) if (indeg[u] === 0) queue.push(u);
  const order: number[] = [];
  let head = 0;
  while (head < queue.length) {
    const u = queue[head++];
    order.push(u);
    for (const v of adj[u]) {
      if (--indeg[v] === 0) queue.push(v);
    }
  }
  if (order.length !== n) throw new Error('kahnTopologicalSort: cycle detected');
  return order;
}
