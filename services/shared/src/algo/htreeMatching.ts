// Hopcroft-Karp algorithm for maximum bipartite matching ("htreeMatching").
// O(E * sqrt(V)) running time on a bipartite graph with disjoint U/V sides.
// Input: number of left nodes nL, right nodes nR, and an adjacency list from
// left -> right. Output: an array `pair` of length nL, where pair[u] is the
// matched right index or -1 if unmatched, plus the matching size.

const NIL = -1;

export interface MatchingResult {
  matchLeft: number[];   // length nL, partner on the right or -1
  matchRight: number[];  // length nR, partner on the left or -1
  size: number;
}

export function hopcroftKarpMatching(
  nL: number,
  nR: number,
  adj: number[][],
): MatchingResult {
  if (!Number.isInteger(nL) || nL < 0) throw new Error('hopcroftKarpMatching: nL invalid');
  if (!Number.isInteger(nR) || nR < 0) throw new Error('hopcroftKarpMatching: nR invalid');
  if (!Array.isArray(adj) || adj.length !== nL) {
    throw new Error('hopcroftKarpMatching: adj must have length nL');
  }
  const matchLeft = new Array<number>(nL).fill(NIL);
  const matchRight = new Array<number>(nR).fill(NIL);
  const dist = new Array<number>(nL).fill(0);

  const bfs = (): boolean => {
    const queue: number[] = [];
    for (let u = 0; u < nL; u += 1) {
      if (matchLeft[u] === NIL) {
        dist[u] = 0;
        queue.push(u);
      } else {
        dist[u] = Infinity;
      }
    }
    let found = false;
    while (queue.length) {
      const u = queue.shift()!;
      for (const v of adj[u]) {
        const pair = matchRight[v];
        if (pair === NIL) {
          found = true;
        } else if (dist[pair] === Infinity) {
          dist[pair] = dist[u] + 1;
          queue.push(pair);
        }
      }
    }
    return found;
  };

  const dfs = (u: number): boolean => {
    for (const v of adj[u]) {
      const pair = matchRight[v];
      if (pair === NIL || (dist[pair] === dist[u] + 1 && dfs(pair))) {
        matchLeft[u] = v;
        matchRight[v] = u;
        return true;
      }
    }
    dist[u] = Infinity;
    return false;
  };

  let size = 0;
  while (bfs()) {
    for (let u = 0; u < nL; u += 1) {
      if (matchLeft[u] === NIL && dfs(u)) size += 1;
    }
  }

  return { matchLeft, matchRight, size };
}

export function htreeMatching(nL: number, nR: number, adj: number[][]): MatchingResult {
  return hopcroftKarpMatching(nL, nR, adj);
}
