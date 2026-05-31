export interface DinicEdge {
  from: number;
  to: number;
  capacity: number;
}

export interface DinicMaxFlowResult {
  maxFlow: number;
  flowMatrix: number[][];
}

interface InternalEdge {
  to: number;
  rev: number;
  cap: number;
  origCap: number;
  isReverse: boolean;
  pairIndex: number; // index into edges for original direction
}

export function dinicMaxFlow(
  vertexCount: number,
  edges: DinicEdge[],
  source: number,
  sink: number,
): DinicMaxFlowResult {
  if (vertexCount < 0) throw new RangeError('vertexCount must be >= 0');
  if (source < 0 || source >= vertexCount) throw new RangeError('source out of range');
  if (sink < 0 || sink >= vertexCount) throw new RangeError('sink out of range');

  const graph: InternalEdge[][] = [];
  for (let i = 0; i < vertexCount; i++) graph.push([]);
  const forwardRefs: { node: number; idx: number; pairIndex: number }[] = [];

  edges.forEach((e, pairIndex) => {
    if (e.capacity < 0) throw new RangeError('negative capacity');
    if (e.from < 0 || e.from >= vertexCount || e.to < 0 || e.to >= vertexCount) {
      throw new RangeError('edge endpoint out of range');
    }
    const fwdIdx = graph[e.from].length;
    const revIdx = graph[e.to].length;
    graph[e.from].push({ to: e.to, rev: revIdx, cap: e.capacity, origCap: e.capacity, isReverse: false, pairIndex });
    graph[e.to].push({ to: e.from, rev: fwdIdx, cap: 0, origCap: 0, isReverse: true, pairIndex });
    forwardRefs.push({ node: e.from, idx: fwdIdx, pairIndex });
  });

  if (source === sink) {
    return { maxFlow: 0, flowMatrix: buildFlowMatrix(vertexCount, edges, graph, forwardRefs) };
  }

  const level = new Array<number>(vertexCount);
  const iter = new Array<number>(vertexCount);

  function bfs(): boolean {
    level.fill(-1);
    level[source] = 0;
    const q: number[] = [source];
    let head = 0;
    while (head < q.length) {
      const u = q[head++];
      for (const e of graph[u]) {
        if (e.cap > 0 && level[e.to] < 0) {
          level[e.to] = level[u] + 1;
          q.push(e.to);
        }
      }
    }
    return level[sink] >= 0;
  }

  function dfs(u: number, pushed: number): number {
    if (u === sink) return pushed;
    for (; iter[u] < graph[u].length; iter[u]++) {
      const e = graph[u][iter[u]];
      if (e.cap > 0 && level[e.to] === level[u] + 1) {
        const d = dfs(e.to, Math.min(pushed, e.cap));
        if (d > 0) {
          e.cap -= d;
          graph[e.to][e.rev].cap += d;
          return d;
        }
      }
    }
    return 0;
  }

  let flow = 0;
  while (bfs()) {
    iter.fill(0);
    while (true) {
      const pushed = dfs(source, Infinity);
      if (pushed === 0) break;
      flow += pushed;
    }
  }
  return { maxFlow: flow, flowMatrix: buildFlowMatrix(vertexCount, edges, graph, forwardRefs) };
}

function buildFlowMatrix(
  n: number,
  edges: DinicEdge[],
  graph: InternalEdge[][],
  forwardRefs: { node: number; idx: number; pairIndex: number }[],
): number[][] {
  const m: number[][] = [];
  for (let i = 0; i < n; i++) m.push(new Array<number>(n).fill(0));
  for (const ref of forwardRefs) {
    const e = graph[ref.node][ref.idx];
    const used = e.origCap - e.cap;
    const orig = edges[ref.pairIndex];
    if (used > 0) m[orig.from][orig.to] += used;
  }
  return m;
}
