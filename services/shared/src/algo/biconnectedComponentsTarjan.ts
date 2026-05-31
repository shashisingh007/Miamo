export interface BiconnectedGraphEdge {
  from: number;
  to: number;
}

export interface BiconnectedComponentsOptions {
  vertexCount: number;
  edges: BiconnectedGraphEdge[];
}

export interface BiconnectedComponent {
  edges: Array<{ from: number; to: number }>;
}

export function biconnectedComponentsTarjan(
  opts: BiconnectedComponentsOptions,
): BiconnectedComponent[] {
  const { vertexCount, edges } = opts;
  if (vertexCount < 0) throw new RangeError('vertexCount must be >= 0');
  if (vertexCount === 0) return [];
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
  const stack: Array<{ from: number; to: number }> = [];
  const components: BiconnectedComponent[] = [];
  let timer = 0;

  const popComponent = (u: number, v: number): void => {
    const comp: BiconnectedComponent = { edges: [] };
    while (stack.length > 0) {
      const e = stack.pop()!;
      comp.edges.push({ from: Math.min(e.from, e.to), to: Math.max(e.from, e.to) });
      if ((e.from === u && e.to === v) || (e.from === v && e.to === u)) break;
    }
    comp.edges.sort((a, b) => (a.from - b.from) || (a.to - b.to));
    components.push(comp);
  };

  const dfs = (u: number, parentEid: number): void => {
    disc[u] = low[u] = timer++;
    let children = 0;
    for (const { to: v, eid } of adj[u]) {
      if (disc[v] === -1) {
        children += 1;
        stack.push({ from: u, to: v });
        dfs(v, eid);
        if (low[v] < low[u]) low[u] = low[v];
        // Articulation/root check: pop component
        if ((disc[u] === 0 && children > 0 && low[v] >= disc[u]) || (disc[u] !== 0 && low[v] >= disc[u])) {
          popComponent(u, v);
        }
      } else if (eid !== parentEid && disc[v] < disc[u]) {
        stack.push({ from: u, to: v });
        if (disc[v] < low[u]) low[u] = disc[v];
      }
    }
  };

  for (let u = 0; u < vertexCount; u++) {
    if (disc[u] === -1) {
      dfs(u, -1);
      // Drain remaining edges from this root's stack frame into one more component.
      if (stack.length > 0) {
        const comp: BiconnectedComponent = { edges: [] };
        while (stack.length > 0) {
          const e = stack.pop()!;
          comp.edges.push({ from: Math.min(e.from, e.to), to: Math.max(e.from, e.to) });
        }
        comp.edges.sort((a, b) => (a.from - b.from) || (a.to - b.to));
        components.push(comp);
      }
    }
  }
  // Sort components for deterministic output: by first edge.
  components.sort((a, b) => {
    if (a.edges.length === 0 && b.edges.length === 0) return 0;
    if (a.edges.length === 0) return -1;
    if (b.edges.length === 0) return 1;
    return (a.edges[0].from - b.edges[0].from) || (a.edges[0].to - b.edges[0].to);
  });
  return components;
}
