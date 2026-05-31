/**
 * Christofides 1.5-approximation for metric TSP.
 *
 * Implementation:
 *   1. Build MST via Prim's algorithm.
 *   2. Find odd-degree vertices in MST.
 *   3. Greedy minimum-weight perfect matching on odd-degree subgraph
 *      (note: NOT optimal matching, so the 1.5 bound only holds with optimal
 *      matching; we still produce a valid Hamiltonian tour).
 *   4. Combine MST + matching → Eulerian multigraph; take Eulerian circuit;
 *      shortcut repeated vertices to a Hamiltonian cycle.
 *
 * Input: full distance matrix dist (square, symmetric, dist[i][i]=0).
 * Returns the tour (length n+1, starts and ends at index 0) and total length.
 */

export interface ChristofidesResult {
  tour: number[];
  length: number;
}

export function christofidesTSP(dist: number[][]): ChristofidesResult {
  if (!Array.isArray(dist)) throw new Error('dist must be 2D array');
  const n = dist.length;
  if (n < 2) throw new Error('need at least 2 nodes');
  for (let i = 0; i < n; i++) {
    if (!Array.isArray(dist[i]) || dist[i].length !== n) {
      throw new Error('dist must be square matrix');
    }
    if (dist[i][i] !== 0) throw new Error('diagonal must be 0');
    for (let j = 0; j < n; j++) {
      if (dist[i][j] !== dist[j][i]) throw new Error('matrix must be symmetric');
      if (dist[i][j] < 0) throw new Error('distances must be non-negative');
    }
  }

  // 1. Prim's MST
  const inMst = new Array(n).fill(false);
  const minEdge = new Array(n).fill(Infinity);
  const parent = new Array(n).fill(-1);
  minEdge[0] = 0;
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (let it = 0; it < n; it++) {
    let u = -1;
    for (let v = 0; v < n; v++) {
      if (!inMst[v] && (u === -1 || minEdge[v] < minEdge[u])) u = v;
    }
    inMst[u] = true;
    if (parent[u] !== -1) {
      adj[u].push(parent[u]);
      adj[parent[u]].push(u);
    }
    for (let v = 0; v < n; v++) {
      if (!inMst[v] && dist[u][v] < minEdge[v]) {
        minEdge[v] = dist[u][v];
        parent[v] = u;
      }
    }
  }

  // 2. odd-degree vertices
  const odd: number[] = [];
  for (let i = 0; i < n; i++) if (adj[i].length % 2 === 1) odd.push(i);

  // 3. greedy minimum-weight perfect matching on odd
  const used = new Array(odd.length).fill(false);
  const matched: [number, number][] = [];
  for (let i = 0; i < odd.length; i++) {
    if (used[i]) continue;
    let bestJ = -1;
    let bestD = Infinity;
    for (let j = i + 1; j < odd.length; j++) {
      if (used[j]) continue;
      if (dist[odd[i]][odd[j]] < bestD) {
        bestD = dist[odd[i]][odd[j]];
        bestJ = j;
      }
    }
    if (bestJ === -1) throw new Error('odd-vertex set has odd cardinality (impossible)');
    used[i] = true;
    used[bestJ] = true;
    matched.push([odd[i], odd[bestJ]]);
  }
  // add matching edges to multigraph
  const mg: Map<number, number[]> = new Map();
  for (let i = 0; i < n; i++) mg.set(i, adj[i].slice());
  for (const [a, b] of matched) {
    mg.get(a)!.push(b);
    mg.get(b)!.push(a);
  }

  // 4. Eulerian circuit (Hierholzer)
  const stack = [0];
  const circuit: number[] = [];
  while (stack.length > 0) {
    const u = stack[stack.length - 1];
    const adjU = mg.get(u)!;
    if (adjU.length === 0) {
      circuit.push(u);
      stack.pop();
    } else {
      const v = adjU.pop()!;
      // remove one occurrence of u from adj of v
      const adjV = mg.get(v)!;
      const idx = adjV.indexOf(u);
      if (idx !== -1) adjV.splice(idx, 1);
      stack.push(v);
    }
  }
  circuit.reverse();

  // shortcut to Hamiltonian
  const seen = new Array(n).fill(false);
  const tour: number[] = [];
  for (const v of circuit) {
    if (!seen[v]) {
      seen[v] = true;
      tour.push(v);
    }
  }
  tour.push(tour[0]);

  let length = 0;
  for (let i = 0; i + 1 < tour.length; i++) length += dist[tour[i]][tour[i + 1]];
  return { tour, length };
}
