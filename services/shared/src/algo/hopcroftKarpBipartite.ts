export interface BipartiteMatchingResult {
  matchingSize: number;
  pairsForLeft: number[];
  pairsForRight: number[];
}

export function hopcroftKarpBipartite(
  leftCount: number,
  rightCount: number,
  edges: Array<[number, number]>
): BipartiteMatchingResult {
  if (leftCount < 0 || rightCount < 0) throw new RangeError('counts must be non-negative');

  const adj: number[][] = [];
  for (let i = 0; i < leftCount; i++) adj.push([]);
  for (const [u, v] of edges) {
    if (u < 0 || u >= leftCount || v < 0 || v >= rightCount) {
      throw new RangeError('edge endpoint out of bounds');
    }
    adj[u].push(v);
  }

  const NIL = -1;
  const pairLeft = new Array<number>(leftCount).fill(NIL);
  const pairRight = new Array<number>(rightCount).fill(NIL);
  const dist = new Array<number>(leftCount).fill(0);
  const INF = Number.POSITIVE_INFINITY;

  const bfs = (): boolean => {
    const queue: number[] = [];
    for (let u = 0; u < leftCount; u++) {
      if (pairLeft[u] === NIL) {
        dist[u] = 0;
        queue.push(u);
      } else {
        dist[u] = INF;
      }
    }
    let found = false;
    let head = 0;
    while (head < queue.length) {
      const u = queue[head++];
      for (const v of adj[u]) {
        const pair = pairRight[v];
        if (pair === NIL) {
          found = true;
        } else if (dist[pair] === INF) {
          dist[pair] = dist[u] + 1;
          queue.push(pair);
        }
      }
    }
    return found;
  };

  const dfs = (u: number): boolean => {
    for (const v of adj[u]) {
      const pair = pairRight[v];
      if (pair === NIL || (dist[pair] === dist[u] + 1 && dfs(pair))) {
        pairLeft[u] = v;
        pairRight[v] = u;
        return true;
      }
    }
    dist[u] = INF;
    return false;
  };

  let matching = 0;
  while (bfs()) {
    for (let u = 0; u < leftCount; u++) {
      if (pairLeft[u] === NIL && dfs(u)) matching += 1;
    }
  }

  return { matchingSize: matching, pairsForLeft: pairLeft, pairsForRight: pairRight };
}
