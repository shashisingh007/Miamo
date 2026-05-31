export interface FlowEdge {
  to: number;
  capacity: number;
}

export interface MaxFlowResult {
  maxFlow: number;
  flowMatrix: number[][];
}

interface InternalEdge {
  to: number;
  cap: number;
  flow: number;
  rev: number;
}

export function edmondsKarpMaxFlow(
  nodeCount: number,
  edges: Array<{ from: number; to: number; capacity: number }>,
  source: number,
  sink: number
): MaxFlowResult {
  if (nodeCount <= 0) throw new RangeError('nodeCount must be positive');
  if (source < 0 || source >= nodeCount) throw new RangeError('source out of bounds');
  if (sink < 0 || sink >= nodeCount) throw new RangeError('sink out of bounds');
  if (source === sink) return { maxFlow: 0, flowMatrix: [] };

  const graph: InternalEdge[][] = [];
  for (let i = 0; i < nodeCount; i++) graph.push([]);

  for (const e of edges) {
    if (e.from < 0 || e.from >= nodeCount || e.to < 0 || e.to >= nodeCount) {
      throw new RangeError('edge endpoint out of bounds');
    }
    if (e.capacity < 0) throw new RangeError('negative capacity');
    const forward: InternalEdge = { to: e.to, cap: e.capacity, flow: 0, rev: graph[e.to].length };
    const backward: InternalEdge = { to: e.from, cap: 0, flow: 0, rev: graph[e.from].length };
    graph[e.from].push(forward);
    graph[e.to].push(backward);
  }

  let totalFlow = 0;
  while (true) {
    const parentNode = new Array<number>(nodeCount).fill(-1);
    const parentEdge = new Array<number>(nodeCount).fill(-1);
    parentNode[source] = source;
    const queue: number[] = [source];
    let head = 0;
    while (head < queue.length && parentNode[sink] === -1) {
      const u = queue[head++];
      for (let i = 0; i < graph[u].length; i++) {
        const e = graph[u][i];
        if (parentNode[e.to] === -1 && e.cap - e.flow > 0) {
          parentNode[e.to] = u;
          parentEdge[e.to] = i;
          queue.push(e.to);
        }
      }
    }
    if (parentNode[sink] === -1) break;
    let pathFlow = Infinity;
    for (let v = sink; v !== source; v = parentNode[v]) {
      const e = graph[parentNode[v]][parentEdge[v]];
      pathFlow = Math.min(pathFlow, e.cap - e.flow);
    }
    for (let v = sink; v !== source; v = parentNode[v]) {
      const e = graph[parentNode[v]][parentEdge[v]];
      e.flow += pathFlow;
      graph[e.to][e.rev].flow -= pathFlow;
    }
    totalFlow += pathFlow;
  }

  const flowMatrix: number[][] = [];
  for (let i = 0; i < nodeCount; i++) {
    flowMatrix.push(new Array<number>(nodeCount).fill(0));
  }
  for (let u = 0; u < nodeCount; u++) {
    for (const e of graph[u]) {
      if (e.cap > 0 && e.flow > 0) flowMatrix[u][e.to] = e.flow;
    }
  }
  return { maxFlow: totalFlow, flowMatrix };
}
