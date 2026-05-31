// Euler Tour + Sparse Table RMQ for O(1) LCA queries.
// Input: rooted tree expressed as adjacency list (children only or undirected).

export interface EulerTourLCA {
  lca(u: number, v: number): number;
}

export function eulerTourLCA(n: number, edges: ReadonlyArray<[number, number]>, root = 0): EulerTourLCA {
  if (n <= 0) throw new Error('eulerTourLCA: n must be > 0');
  if (root < 0 || root >= n) throw new Error('eulerTourLCA: root out of range');

  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    if (u < 0 || u >= n || v < 0 || v >= n) throw new Error('eulerTourLCA: edge endpoint out of range');
    adj[u].push(v);
    adj[v].push(u);
  }

  const eulerNodes: number[] = [];
  const eulerDepth: number[] = [];
  const firstOccurrence = new Array<number>(n).fill(-1);

  // iterative DFS to avoid stack overflow
  const stack: Array<{ node: number; parent: number; depth: number; childIdx: number }> = [];
  stack.push({ node: root, parent: -1, depth: 0, childIdx: 0 });
  while (stack.length > 0) {
    const top = stack[stack.length - 1];
    if (top.childIdx === 0) {
      if (firstOccurrence[top.node] === -1) firstOccurrence[top.node] = eulerNodes.length;
      eulerNodes.push(top.node);
      eulerDepth.push(top.depth);
    }
    let advanced = false;
    while (top.childIdx < adj[top.node].length) {
      const child = adj[top.node][top.childIdx++];
      if (child === top.parent) continue;
      stack.push({ node: child, parent: top.node, depth: top.depth + 1, childIdx: 0 });
      advanced = true;
      break;
    }
    if (!advanced) {
      stack.pop();
      if (stack.length > 0) {
        const parent = stack[stack.length - 1];
        eulerNodes.push(parent.node);
        eulerDepth.push(parent.depth);
      }
    }
  }

  const m = eulerDepth.length;
  const logTable = new Array<number>(m + 1).fill(0);
  for (let i = 2; i <= m; i += 1) logTable[i] = logTable[i >> 1] + 1;
  const K = logTable[m] + 1;
  const sparse: number[][] = Array.from({ length: K }, () => new Array<number>(m).fill(0));
  for (let i = 0; i < m; i += 1) sparse[0][i] = i;
  for (let k = 1; k < K; k += 1) {
    const len = 1 << k;
    for (let i = 0; i + len <= m; i += 1) {
      const a = sparse[k - 1][i];
      const b = sparse[k - 1][i + (1 << (k - 1))];
      sparse[k][i] = eulerDepth[a] <= eulerDepth[b] ? a : b;
    }
  }

  return {
    lca(u: number, v: number): number {
      if (u < 0 || u >= n || v < 0 || v >= n) throw new Error('eulerTourLCA.lca: node out of range');
      const fu = firstOccurrence[u];
      const fv = firstOccurrence[v];
      if (fu === -1 || fv === -1) throw new Error('eulerTourLCA.lca: node not in tree');
      let l = Math.min(fu, fv);
      let r = Math.max(fu, fv);
      const len = r - l + 1;
      const k = logTable[len];
      const a = sparse[k][l];
      const b = sparse[k][r - (1 << k) + 1];
      const idx = eulerDepth[a] <= eulerDepth[b] ? a : b;
      return eulerNodes[idx];
    },
  };
}
