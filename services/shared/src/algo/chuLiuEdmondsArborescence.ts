// Chu-Liu / Edmonds minimum spanning arborescence rooted at a given node.
// Simple O(V*E) implementation (sufficient for small/medium graphs). Returns
// the set of chosen edges (indices into the input list) along with total
// weight. Throws if any non-root vertex has no incoming edge (no arborescence
// exists).
//
// Edges are directed: { from, to, weight }. Self-loops and edges into the root
// are ignored.

export interface ArborescenceEdge {
  from: number;
  to: number;
  weight: number;
}

export interface ArborescenceResult {
  edgeIndices: number[]; // indices into the original edges array
  totalWeight: number;
}

export function chuLiuEdmondsArborescence(
  n: number,
  edges: ArborescenceEdge[],
  root: number,
): ArborescenceResult {
  if (!Number.isInteger(n) || n <= 0) throw new RangeError('n must be a positive integer');
  if (!Number.isInteger(root) || root < 0 || root >= n) throw new RangeError('root out of range');
  if (!Array.isArray(edges)) throw new TypeError('edges must be an array');
  for (const e of edges) {
    if (!Number.isInteger(e.from) || !Number.isInteger(e.to)) {
      throw new TypeError('edge endpoints must be integers');
    }
    if (e.from < 0 || e.from >= n || e.to < 0 || e.to >= n) {
      throw new RangeError('edge endpoint out of range');
    }
    if (!Number.isFinite(e.weight)) throw new RangeError('edge weight must be finite');
  }

  // Recursive driver with edge index mapping.
  return solve(n, edges, edges.map((_, i) => i), root);
}

function solve(
  n: number,
  edges: ArborescenceEdge[],
  origIdx: number[],
  root: number,
): ArborescenceResult {
  // 1. For each vertex (except root), pick the cheapest incoming edge.
  const INF = Number.POSITIVE_INFINITY;
  const minIn: number[] = new Array(n).fill(INF);
  const minInEdge: number[] = new Array(n).fill(-1); // index into edges (local)
  for (let i = 0; i < edges.length; i += 1) {
    const e = edges[i];
    if (e.from === e.to) continue;
    if (e.to === root) continue;
    if (e.weight < minIn[e.to]) {
      minIn[e.to] = e.weight;
      minInEdge[e.to] = i;
    }
  }
  for (let v = 0; v < n; v += 1) {
    if (v === root) continue;
    if (minInEdge[v] === -1) throw new Error(`no incoming edge for vertex ${v} (no arborescence)`);
  }

  // 2. Detect cycles by following minIn pointers.
  const id: number[] = new Array(n).fill(-1); // cycle id, or -1
  const visited: number[] = new Array(n).fill(-1);
  let cycles = 0;
  for (let v = 0; v < n; v += 1) {
    let u = v;
    while (u !== root && visited[u] === -1 && id[u] === -1) {
      visited[u] = v;
      u = edges[minInEdge[u]].from;
    }
    if (u !== root && visited[u] === v && id[u] === -1) {
      // found new cycle starting at u
      let w = u;
      do {
        id[w] = cycles;
        w = edges[minInEdge[w]].from;
      } while (w !== u);
      cycles += 1;
    }
  }

  if (cycles === 0) {
    // No cycle: minIn edges form the arborescence.
    const out: number[] = [];
    let total = 0;
    for (let v = 0; v < n; v += 1) {
      if (v === root) continue;
      out.push(origIdx[minInEdge[v]]);
      total += edges[minInEdge[v]].weight;
    }
    return { edgeIndices: out, totalWeight: total };
  }

  // 3. Assign IDs: non-cycle vertices each get their own fresh id.
  for (let v = 0; v < n; v += 1) {
    if (id[v] === -1) {
      id[v] = cycles;
      cycles += 1;
    }
  }

  // 4. Build contracted graph.
  const newEdges: ArborescenceEdge[] = [];
  const newOrigIdx: number[] = [];
  for (let i = 0; i < edges.length; i += 1) {
    const e = edges[i];
    const fu = id[e.from];
    const fv = id[e.to];
    if (fu === fv) continue;
    // subtract the cheapest incoming edge weight at the cycle vertex e.to.
    const w = e.weight - (e.to === root ? 0 : minIn[e.to]);
    newEdges.push({ from: fu, to: fv, weight: w });
    newOrigIdx.push(origIdx[i]);
  }

  const newRoot = id[root];
  const sub = solve(cycles, newEdges, newOrigIdx, newRoot);

  // 5. Lift chosen edges back. Start with sub edges (already mapped to original
  // indices). Mark which cycle-vertex's incoming-edge has been "broken" by the
  // chosen super-edge.
  const chosenSet = new Set<number>(sub.edgeIndices);
  // Determine which v inside each cycle gets its inner cycle-edge dropped.
  // For each chosen original edge that targets some real vertex v, drop the
  // cycle's inner edge into v.
  const droppedTargets = new Set<number>();
  for (const origIndex of sub.edgeIndices) {
    droppedTargets.add(edges[findLocalByOrig(edges, origIdx, origIndex)].to);
  }

  let total = 0;
  for (const oi of chosenSet) {
    const localIdx = findLocalByOrig(edges, origIdx, oi);
    total += edges[localIdx].weight;
  }

  // Add inner cycle edges (minIn[v]) for every v in any cycle EXCEPT the v
  // whose cycle-incoming edge was replaced by an external one.
  for (let v = 0; v < n; v += 1) {
    if (v === root) continue;
    if (id[v] >= cycles - (cycles - countCycles(id, n))) {
      // not in a cycle (was assigned non-cycle id)
    }
  }
  // Simpler: iterate all v; if v is in any cycle (id[v] < original cycles) and
  // v is not in droppedTargets, include its minIn edge.
  // Recompute originalCycleCount: vertices in cycles had id assigned in step 2
  // before step 3 reassignment. We can detect them by re-scanning: any v with
  // visited[v] !== -1 and id-was-set-in-step-2 ... easier to redo cycle detection:
  const inCycle = recomputeInCycle(n, edges, minInEdge, root);
  for (let v = 0; v < n; v += 1) {
    if (v === root) continue;
    if (inCycle[v] && !droppedTargets.has(v)) {
      const oi = origIdx[minInEdge[v]];
      chosenSet.add(oi);
      total += edges[minInEdge[v]].weight;
    }
  }

  return { edgeIndices: Array.from(chosenSet).sort((a, b) => a - b), totalWeight: total };
}

function findLocalByOrig(edges: ArborescenceEdge[], origIdx: number[], target: number): number {
  for (let i = 0; i < origIdx.length; i += 1) if (origIdx[i] === target) return i;
  return -1;
}

function countCycles(id: number[], n: number): number {
  const seen = new Set<number>();
  for (let i = 0; i < n; i += 1) seen.add(id[i]);
  return seen.size;
}

function recomputeInCycle(
  n: number,
  edges: ArborescenceEdge[],
  minInEdge: number[],
  root: number,
): boolean[] {
  const visited: number[] = new Array(n).fill(-1);
  const inCycle: boolean[] = new Array(n).fill(false);
  for (let v = 0; v < n; v += 1) {
    let u = v;
    const path: number[] = [];
    while (u !== root && visited[u] === -1 && !inCycle[u]) {
      visited[u] = v;
      path.push(u);
      u = edges[minInEdge[u]].from;
    }
    if (u !== root && visited[u] === v) {
      let w = u;
      do {
        inCycle[w] = true;
        w = edges[minInEdge[w]].from;
      } while (w !== u);
    }
  }
  return inCycle;
}
