/**
 * Ford-Fulkerson max flow with BFS augmenting paths (Edmonds-Karp variant).
 * capacity[u][v] is the capacity of edge u->v. Returns max flow from s to t.
 *
 * NOTE: Edmonds-Karp already exists in this codebase. This implementation
 * exposes the more general Ford-Fulkerson interface, returning both the
 * max flow value and the resulting flow matrix.
 */
export interface FordFulkersonResult {
  flow: number;
  flowMatrix: number[][];
}

export function fordFulkersonMaxFlow(
  capacity: number[][],
  source: number,
  sink: number
): FordFulkersonResult {
  if (!Array.isArray(capacity)) throw new Error('fordFulkersonMaxFlow: bad capacity');
  const n = capacity.length;
  if (n === 0) throw new Error('fordFulkersonMaxFlow: empty graph');
  for (const row of capacity) {
    if (!Array.isArray(row) || row.length !== n) {
      throw new Error('fordFulkersonMaxFlow: capacity must be square');
    }
    for (const c of row) {
      if (!Number.isFinite(c) || c < 0) throw new Error('fordFulkersonMaxFlow: bad capacity value');
    }
  }
  if (!Number.isInteger(source) || source < 0 || source >= n) {
    throw new Error('fordFulkersonMaxFlow: bad source');
  }
  if (!Number.isInteger(sink) || sink < 0 || sink >= n) {
    throw new Error('fordFulkersonMaxFlow: bad sink');
  }
  if (source === sink) throw new Error('fordFulkersonMaxFlow: source equals sink');

  const residual: number[][] = capacity.map((row) => row.slice());
  const flowMatrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  let total = 0;

  while (true) {
    const parent = new Array(n).fill(-1);
    parent[source] = source;
    const queue: number[] = [source];
    let head = 0;
    while (head < queue.length && parent[sink] === -1) {
      const u = queue[head++];
      for (let v = 0; v < n; v++) {
        if (parent[v] === -1 && residual[u][v] > 0) {
          parent[v] = u;
          queue.push(v);
        }
      }
    }
    if (parent[sink] === -1) break;
    let pushFlow = Infinity;
    for (let v = sink; v !== source; v = parent[v]) {
      pushFlow = Math.min(pushFlow, residual[parent[v]][v]);
    }
    for (let v = sink; v !== source; v = parent[v]) {
      const u = parent[v];
      residual[u][v] -= pushFlow;
      residual[v][u] += pushFlow;
      flowMatrix[u][v] += pushFlow;
      flowMatrix[v][u] -= pushFlow;
    }
    total += pushFlow;
  }
  return { flow: total, flowMatrix };
}
