export interface HierholzerEdge {
  from: number;
  to: number;
}

export interface HierholzerResult {
  hasEulerCircuit: boolean;
  circuit: number[];
}

export function hierholzerEulerCircuit(
  vertexCount: number,
  edges: HierholzerEdge[],
  start: number = 0,
): HierholzerResult {
  if (vertexCount < 0) throw new RangeError('vertexCount must be >= 0');
  if (vertexCount > 0 && (start < 0 || start >= vertexCount)) {
    throw new RangeError('start out of range');
  }
  for (const e of edges) {
    if (e.from < 0 || e.from >= vertexCount || e.to < 0 || e.to >= vertexCount) {
      throw new RangeError('edge endpoint out of range');
    }
  }

  if (edges.length === 0) {
    if (vertexCount === 0) return { hasEulerCircuit: true, circuit: [] };
    return { hasEulerCircuit: true, circuit: [start] };
  }

  const adj: Array<{ to: number; used: boolean; pair: number }[]> = [];
  for (let i = 0; i < vertexCount; i++) adj.push([]);
  edges.forEach((e) => {
    const aIdx = adj[e.from].length;
    const bIdx = adj[e.to].length;
    adj[e.from].push({ to: e.to, used: false, pair: bIdx });
    adj[e.to].push({ to: e.from, used: false, pair: aIdx });
    adj[e.from][aIdx].pair = bIdx;
    adj[e.to][bIdx].pair = aIdx;
  });

  const degree = adj.map((a) => a.length);
  for (let i = 0; i < vertexCount; i++) {
    if (degree[i] % 2 !== 0) return { hasEulerCircuit: false, circuit: [] };
  }
  if (degree[start] === 0) return { hasEulerCircuit: false, circuit: [] };

  const iter = new Array<number>(vertexCount).fill(0);
  const stack: number[] = [start];
  const circuit: number[] = [];
  while (stack.length > 0) {
    const u = stack[stack.length - 1];
    while (iter[u] < adj[u].length && adj[u][iter[u]].used) iter[u]++;
    if (iter[u] === adj[u].length) {
      circuit.push(u);
      stack.pop();
    } else {
      const e = adj[u][iter[u]];
      e.used = true;
      adj[e.to][e.pair].used = true;
      stack.push(e.to);
    }
  }
  if (circuit.length - 1 !== edges.length) return { hasEulerCircuit: false, circuit: [] };
  circuit.reverse();
  return { hasEulerCircuit: true, circuit };
}
