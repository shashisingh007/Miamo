// AHU (Aho-Hopcroft-Ullman) canonical form for rooted trees + unrooted-tree
// isomorphism via center(s).
// Two rooted trees are isomorphic iff their canonical strings are equal.

export interface TreeAdjacency {
  n: number;
  edges: [number, number][];
}

function buildAdj(n: number, edges: [number, number][]): number[][] {
  if (!Number.isInteger(n) || n <= 0) throw new RangeError('n must be a positive integer');
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    if (
      !Number.isInteger(u) ||
      !Number.isInteger(v) ||
      u < 0 ||
      v < 0 ||
      u >= n ||
      v >= n ||
      u === v
    ) {
      throw new RangeError('invalid edge');
    }
    adj[u].push(v);
    adj[v].push(u);
  }
  return adj;
}

export function canonicalRootedTree(tree: TreeAdjacency, root: number): string {
  if (!Number.isInteger(root) || root < 0 || root >= tree.n) {
    throw new RangeError('root out of range');
  }
  const adj = buildAdj(tree.n, tree.edges);
  function dfs(u: number, parent: number): string {
    const subs: string[] = [];
    for (const v of adj[u]) {
      if (v === parent) continue;
      subs.push(dfs(v, u));
    }
    subs.sort();
    return `(${subs.join('')})`;
  }
  return dfs(root, -1);
}

function findCenters(adj: number[][]): number[] {
  const n = adj.length;
  if (n === 1) return [0];
  const degree = adj.map((a) => a.length);
  let leaves: number[] = [];
  for (let i = 0; i < n; i += 1) if (degree[i] <= 1) leaves.push(i);
  let remaining = n;
  while (remaining > 2) {
    remaining -= leaves.length;
    const next: number[] = [];
    for (const u of leaves) {
      for (const v of adj[u]) {
        degree[v] -= 1;
        if (degree[v] === 1) next.push(v);
      }
    }
    leaves = next;
  }
  return leaves;
}

export function treeIsomorphismAhu(a: TreeAdjacency, b: TreeAdjacency): boolean {
  if (a.n !== b.n) return false;
  if (a.edges.length !== b.edges.length) return false;
  if (a.n === 1) return true;
  const adjA = buildAdj(a.n, a.edges);
  const adjB = buildAdj(b.n, b.edges);
  const centersA = findCenters(adjA);
  const centersB = findCenters(adjB);
  const canonsA = centersA.map((c) => canonicalRootedTree(a, c));
  const canonsB = centersB.map((c) => canonicalRootedTree(b, c));
  for (const ca of canonsA) {
    for (const cb of canonsB) {
      if (ca === cb) return true;
    }
  }
  return false;
}
