// Min-cost max-flow using SPFA-based Bellman-Ford successive shortest paths.

export interface FlowEdgeInput {
  from: number;
  to: number;
  capacity: number;
  cost: number;
}

interface InternalEdge {
  to: number;
  cap: number;
  cost: number;
  flow: number;
  rev: number;
}

export interface MinCostMaxFlowResult {
  flow: number;
  cost: number;
}

export function minCostMaxFlow(
  n: number,
  edges: ReadonlyArray<FlowEdgeInput>,
  source: number,
  sink: number,
): MinCostMaxFlowResult {
  if (n <= 0) throw new Error('minCostMaxFlow: n must be > 0');
  if (source < 0 || source >= n || sink < 0 || sink >= n) {
    throw new Error('minCostMaxFlow: source/sink out of range');
  }
  if (source === sink) return { flow: 0, cost: 0 };

  const graph: InternalEdge[][] = Array.from({ length: n }, () => []);
  for (const e of edges) {
    if (e.from < 0 || e.from >= n || e.to < 0 || e.to >= n) {
      throw new Error('minCostMaxFlow: edge endpoint out of range');
    }
    if (e.capacity < 0) throw new Error('minCostMaxFlow: negative capacity');
    const a: InternalEdge = { to: e.to, cap: e.capacity, cost: e.cost, flow: 0, rev: graph[e.to].length };
    const b: InternalEdge = { to: e.from, cap: 0, cost: -e.cost, flow: 0, rev: graph[e.from].length };
    graph[e.from].push(a);
    graph[e.to].push(b);
  }

  let totalFlow = 0;
  let totalCost = 0;

  while (true) {
    const dist = new Array<number>(n).fill(Infinity);
    const inQueue = new Array<boolean>(n).fill(false);
    const prevNode = new Array<number>(n).fill(-1);
    const prevEdge = new Array<number>(n).fill(-1);
    dist[source] = 0;
    const queue: number[] = [source];
    inQueue[source] = true;
    while (queue.length > 0) {
      const u = queue.shift()!;
      inQueue[u] = false;
      const edgesU = graph[u];
      for (let i = 0; i < edgesU.length; i += 1) {
        const e = edgesU[i];
        if (e.cap - e.flow > 0 && dist[u] + e.cost < dist[e.to]) {
          dist[e.to] = dist[u] + e.cost;
          prevNode[e.to] = u;
          prevEdge[e.to] = i;
          if (!inQueue[e.to]) {
            queue.push(e.to);
            inQueue[e.to] = true;
          }
        }
      }
    }
    if (dist[sink] === Infinity) break;

    let pushFlow = Infinity;
    let cur = sink;
    while (cur !== source) {
      const e = graph[prevNode[cur]][prevEdge[cur]];
      pushFlow = Math.min(pushFlow, e.cap - e.flow);
      cur = prevNode[cur];
    }
    cur = sink;
    while (cur !== source) {
      const e = graph[prevNode[cur]][prevEdge[cur]];
      e.flow += pushFlow;
      graph[e.to][e.rev].flow -= pushFlow;
      cur = prevNode[cur];
    }
    totalFlow += pushFlow;
    totalCost += pushFlow * dist[sink];
  }

  return { flow: totalFlow, cost: totalCost };
}
