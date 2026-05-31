// LCA via binary lifting on a rooted tree.
// Preprocess: O(n log n) time, O(n log n) memory.
// Query: O(log n) per LCA.

export interface LcaIndex {
  parent: number[][]; // parent[k][v] = 2^k-th ancestor of v (-1 if none)
  depth: number[];
  log: number;
  root: number;
}

export function buildLcaBinaryLift(adj: number[][], root: number): LcaIndex {
  if (!Array.isArray(adj)) throw new Error('buildLcaBinaryLift: adj must be array');
  const n = adj.length;
  if (!Number.isInteger(root) || root < 0 || root >= n) {
    throw new Error('buildLcaBinaryLift: root must be a valid vertex index');
  }
  if (n === 0) {
    return { parent: [[]], depth: [], log: 0, root };
  }
  const log = Math.max(1, Math.ceil(Math.log2(n)));
  const parent: number[][] = Array.from({ length: log + 1 }, () => new Array<number>(n).fill(-1));
  const depth = new Array<number>(n).fill(0);
  // BFS from root to set parent[0] and depth.
  const queue: number[] = [root];
  const visited = new Uint8Array(n);
  visited[root] = 1;
  let head = 0;
  while (head < queue.length) {
    const u = queue[head++];
    for (const v of adj[u]) {
      if (!visited[v]) {
        visited[v] = 1;
        parent[0][v] = u;
        depth[v] = depth[u] + 1;
        queue.push(v);
      }
    }
  }
  for (let k = 1; k <= log; k += 1) {
    for (let v = 0; v < n; v += 1) {
      const mid = parent[k - 1][v];
      parent[k][v] = mid === -1 ? -1 : parent[k - 1][mid];
    }
  }
  return { parent, depth, log, root };
}

export function lcaQuery(idx: LcaIndex, u: number, v: number): number {
  if (!Number.isInteger(u) || !Number.isInteger(v)) throw new Error('lcaQuery: u, v must be integers');
  if (u < 0 || u >= idx.depth.length || v < 0 || v >= idx.depth.length) {
    throw new Error('lcaQuery: out of range');
  }
  let a = u;
  let b = v;
  if (idx.depth[a] < idx.depth[b]) {
    const t = a;
    a = b;
    b = t;
  }
  let diff = idx.depth[a] - idx.depth[b];
  for (let k = 0; diff > 0; k += 1, diff >>>= 1) {
    if (diff & 1) a = idx.parent[k][a];
  }
  if (a === b) return a;
  for (let k = idx.log; k >= 0; k -= 1) {
    if (idx.parent[k][a] !== idx.parent[k][b]) {
      a = idx.parent[k][a];
      b = idx.parent[k][b];
    }
  }
  return idx.parent[0][a];
}

export function lcaBinaryLifting() {
  return { buildLcaBinaryLift, lcaQuery };
}
