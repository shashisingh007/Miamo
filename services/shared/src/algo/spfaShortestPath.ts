// SPFA (Shortest Path Faster Algorithm) — Bellman-Ford with a queue.
// Detects negative cycles by counting how often each vertex is relaxed; if any
// vertex is relaxed >= V times we report a negative cycle.

export interface SpfaEdge {
  from: number;
  to: number;
  weight: number;
}

export interface SpfaResult {
  distances: number[]; // Infinity if unreachable
  predecessor: number[]; // -1 if none
  negativeCycle: boolean;
}

export function spfaShortestPath(
  vertices: number,
  edges: SpfaEdge[],
  source: number,
): SpfaResult {
  if (!Number.isInteger(vertices) || vertices <= 0) {
    throw new RangeError('vertices must be a positive integer');
  }
  if (!Number.isInteger(source) || source < 0 || source >= vertices) {
    throw new RangeError('source out of range');
  }
  const adj: { to: number; w: number }[][] = Array.from({ length: vertices }, () => []);
  for (const e of edges) {
    if (
      !Number.isInteger(e.from) ||
      !Number.isInteger(e.to) ||
      e.from < 0 ||
      e.to < 0 ||
      e.from >= vertices ||
      e.to >= vertices
    ) {
      throw new RangeError('edge endpoint out of range');
    }
    if (!Number.isFinite(e.weight)) throw new TypeError('edge weight must be finite');
    adj[e.from].push({ to: e.to, w: e.weight });
  }
  const dist = new Array<number>(vertices).fill(Infinity);
  const pred = new Array<number>(vertices).fill(-1);
  const inQueue = new Uint8Array(vertices);
  const count = new Array<number>(vertices).fill(0);
  dist[source] = 0;
  const queue: number[] = [source];
  inQueue[source] = 1;
  while (queue.length > 0) {
    const u = queue.shift()!;
    inQueue[u] = 0;
    for (const { to: v, w } of adj[u]) {
      const cand = dist[u] + w;
      if (cand < dist[v]) {
        dist[v] = cand;
        pred[v] = u;
        if (!inQueue[v]) {
          queue.push(v);
          inQueue[v] = 1;
          count[v] += 1;
          if (count[v] >= vertices) {
            return { distances: dist, predecessor: pred, negativeCycle: true };
          }
        }
      }
    }
  }
  return { distances: dist, predecessor: pred, negativeCycle: false };
}
