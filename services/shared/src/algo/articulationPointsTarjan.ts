export interface ArticulationGraphEdge {
  from: number;
  to: number;
}

export interface ArticulationPointsOptions {
  vertexCount: number;
  edges: ArticulationGraphEdge[];
}

export function articulationPointsTarjan(opts: ArticulationPointsOptions): number[] {
  const { vertexCount, edges } = opts;
  if (vertexCount < 0) throw new RangeError('vertexCount must be >= 0');
  if (vertexCount === 0) return [];
  const adj: number[][] = Array.from({ length: vertexCount }, () => []);
  for (const e of edges) {
    if (e.from < 0 || e.from >= vertexCount) throw new RangeError('edge from out of range');
    if (e.to < 0 || e.to >= vertexCount) throw new RangeError('edge to out of range');
    if (e.from === e.to) continue;
    adj[e.from].push(e.to);
    adj[e.to].push(e.from);
  }
  const disc = new Array<number>(vertexCount).fill(-1);
  const low = new Array<number>(vertexCount).fill(-1);
  const isArt = new Array<boolean>(vertexCount).fill(false);
  let timer = 0;

  const dfs = (u: number, parent: number): void => {
    disc[u] = low[u] = timer++;
    let children = 0;
    for (const v of adj[u]) {
      if (disc[v] === -1) {
        children += 1;
        dfs(v, u);
        if (low[v] < low[u]) low[u] = low[v];
        if (parent !== -1 && low[v] >= disc[u]) isArt[u] = true;
      } else if (v !== parent) {
        if (disc[v] < low[u]) low[u] = disc[v];
      }
    }
    if (parent === -1 && children > 1) isArt[u] = true;
  };

  for (let u = 0; u < vertexCount; u++) {
    if (disc[u] === -1) dfs(u, -1);
  }
  const out: number[] = [];
  for (let i = 0; i < vertexCount; i++) if (isArt[i]) out.push(i);
  return out;
}
