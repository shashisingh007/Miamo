export function bronKerboschCliques(adjacency: number[][]): number[][] {
  const n = adjacency.length;
  const adj: Set<number>[] = [];
  for (let i = 0; i < n; i++) adj.push(new Set<number>());
  for (let i = 0; i < n; i++) {
    for (const j of adjacency[i]) {
      if (j === i || j < 0 || j >= n) continue;
      adj[i].add(j);
      adj[j].add(i);
    }
  }

  const cliques: number[][] = [];

  function recurse(R: Set<number>, P: Set<number>, X: Set<number>): void {
    if (P.size === 0 && X.size === 0) {
      cliques.push([...R].sort((a, b) => a - b));
      return;
    }
    let pivot = -1;
    let bestCount = -1;
    const union: number[] = [];
    for (const v of P) union.push(v);
    for (const v of X) union.push(v);
    for (const u of union) {
      let c = 0;
      for (const v of P) if (adj[u].has(v)) c += 1;
      if (c > bestCount) {
        bestCount = c;
        pivot = u;
      }
    }
    const candidates: number[] = [];
    for (const v of P) {
      if (pivot === -1 || !adj[pivot].has(v)) candidates.push(v);
    }
    for (const v of candidates) {
      R.add(v);
      const newP = new Set<number>();
      const newX = new Set<number>();
      for (const w of P) if (adj[v].has(w)) newP.add(w);
      for (const w of X) if (adj[v].has(w)) newX.add(w);
      recurse(R, newP, newX);
      R.delete(v);
      P.delete(v);
      X.add(v);
    }
  }

  recurse(new Set<number>(), new Set<number>(Array.from({ length: n }, (_, i) => i)), new Set<number>());
  cliques.sort((a, b) => {
    if (a.length !== b.length) return b.length - a.length;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
  });
  return cliques;
}
