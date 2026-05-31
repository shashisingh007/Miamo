export interface BridgeGraphEdge {
  from: number;
  to: number;
}

export interface TarjanBridgesOptions {
  vertexCount: number;
  edges: BridgeGraphEdge[];
}

export interface Bridge {
  from: number;
  to: number;
}

export function tarjanBridges(opts: TarjanBridgesOptions): Bridge[] {
  const { vertexCount, edges } = opts;
  if (vertexCount < 0) throw new RangeError('vertexCount must be >= 0');
  if (vertexCount === 0) return [];
  // Adjacency with edge ids so parallel edges aren't mistaken for back-edges.
  const adj: Array<Array<{ to: number; eid: number }>> = Array.from({ length: vertexCount }, () => []);
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    if (e.from < 0 || e.from >= vertexCount) throw new RangeError('edge from out of range');
    if (e.to < 0 || e.to >= vertexCount) throw new RangeError('edge to out of range');
    if (e.from === e.to) continue;
    adj[e.from].push({ to: e.to, eid: i });
    adj[e.to].push({ to: e.from, eid: i });
  }
  const disc = new Array<number>(vertexCount).fill(-1);
  const low = new Array<number>(vertexCount).fill(-1);
  const bridges: Bridge[] = [];
  let timer = 0;

  const dfs = (u: number, parentEid: number): void => {
    disc[u] = low[u] = timer++;
    for (const { to: v, eid } of adj[u]) {
      if (disc[v] === -1) {
        dfs(v, eid);
        if (low[v] < low[u]) low[u] = low[v];
        if (low[v] > disc[u]) {
          const from = Math.min(u, v);
          const to = Math.max(u, v);
          bridges.push({ from, to });
        }
      } else if (eid !== parentEid) {
        if (disc[v] < low[u]) low[u] = disc[v];
      }
    }
  };

  for (let u = 0; u < vertexCount; u++) {
    if (disc[u] === -1) dfs(u, -1);
  }
  bridges.sort((a, b) => (a.from - b.from) || (a.to - b.to));
  return bridges;
}
