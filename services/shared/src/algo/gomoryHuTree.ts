// Gomory-Hu tree for all-pairs minimum s-t cut on undirected weighted graphs.
// Construction does n-1 max-flow runs (Edmonds-Karp BFS augmentation here).
// Result is a tree on the same vertex set where the min-cut between any two
// vertices in the original graph equals the minimum edge weight on the path
// between them in the tree.

interface Edge {
  to: number;
  cap: number;
  flow: number;
  rev: number;
}

function buildResidual(n: number, edges: ReadonlyArray<[number, number, number]>): Edge[][] {
  const g: Edge[][] = Array.from({ length: n }, () => []);
  for (const [u, v, c] of edges) {
    if (u < 0 || u >= n || v < 0 || v >= n) throw new Error('Gomory-Hu: bad edge endpoint');
    if (c < 0) throw new Error('Gomory-Hu: negative capacity');
    g[u].push({ to: v, cap: c, flow: 0, rev: g[v].length });
    g[v].push({ to: u, cap: c, flow: 0, rev: g[u].length - 1 });
  }
  return g;
}

function resetFlow(g: Edge[][]): void {
  for (const list of g) for (const e of list) e.flow = 0;
}

function bfsAugment(g: Edge[][], s: number, t: number): number {
  const n = g.length;
  const parentNode = new Int32Array(n).fill(-1);
  const parentEdge = new Int32Array(n).fill(-1);
  parentNode[s] = s;
  const queue: number[] = [s];
  while (queue.length) {
    const u = queue.shift()!;
    for (let i = 0; i < g[u].length; i += 1) {
      const e = g[u][i];
      if (parentNode[e.to] === -1 && e.cap - e.flow > 0) {
        parentNode[e.to] = u;
        parentEdge[e.to] = i;
        if (e.to === t) {
          let cur = t;
          let bottleneck = Infinity;
          while (cur !== s) {
            const p = parentNode[cur];
            const edge = g[p][parentEdge[cur]];
            bottleneck = Math.min(bottleneck, edge.cap - edge.flow);
            cur = p;
          }
          cur = t;
          while (cur !== s) {
            const p = parentNode[cur];
            const edge = g[p][parentEdge[cur]];
            edge.flow += bottleneck;
            g[cur][edge.rev].flow -= bottleneck;
            cur = p;
          }
          return bottleneck;
        }
        queue.push(e.to);
      }
    }
  }
  return 0;
}

function maxFlow(g: Edge[][], s: number, t: number): number {
  resetFlow(g);
  let total = 0;
  while (true) {
    const f = bfsAugment(g, s, t);
    if (f === 0) break;
    total += f;
  }
  return total;
}

function minCutSide(g: Edge[][], s: number): boolean[] {
  const n = g.length;
  const visited = new Array<boolean>(n).fill(false);
  visited[s] = true;
  const queue: number[] = [s];
  while (queue.length) {
    const u = queue.shift()!;
    for (const e of g[u]) {
      if (!visited[e.to] && e.cap - e.flow > 0) {
        visited[e.to] = true;
        queue.push(e.to);
      }
    }
  }
  return visited;
}

export interface GomoryHuEdge {
  u: number;
  v: number;
  weight: number;
}

export function gomoryHuTree(n: number, edges: ReadonlyArray<[number, number, number]>): GomoryHuEdge[] {
  if (!Number.isInteger(n) || n < 0) throw new Error('gomoryHuTree: n must be non-negative integer');
  if (n === 0) return [];
  const parent = new Array<number>(n).fill(0);
  const flow = new Array<number>(n).fill(0);
  for (let i = 1; i < n; i += 1) {
    const g = buildResidual(n, edges);
    const f = maxFlow(g, i, parent[i]);
    flow[i] = f;
    const side = minCutSide(g, i);
    for (let j = i + 1; j < n; j += 1) {
      if (side[j] && parent[j] === parent[i]) parent[j] = i;
    }
  }
  const out: GomoryHuEdge[] = [];
  for (let i = 1; i < n; i += 1) out.push({ u: i, v: parent[i], weight: flow[i] });
  return out;
}
