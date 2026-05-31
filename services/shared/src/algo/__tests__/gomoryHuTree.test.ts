import { describe, it, expect } from 'vitest';
import { gomoryHuTree, type GomoryHuEdge } from '../gomoryHuTree';

function pathMin(tree: GomoryHuEdge[], n: number, s: number, t: number): number {
  if (s === t) return Infinity;
  const adj: Array<Array<{ to: number; w: number }>> = Array.from({ length: n }, () => []);
  for (const e of tree) {
    adj[e.u].push({ to: e.v, w: e.weight });
    adj[e.v].push({ to: e.u, w: e.weight });
  }
  const visited = new Array<boolean>(n).fill(false);
  const minOnPath = new Array<number>(n).fill(Infinity);
  visited[s] = true;
  const stack: number[] = [s];
  while (stack.length) {
    const u = stack.pop()!;
    for (const { to, w } of adj[u]) {
      if (!visited[to]) {
        visited[to] = true;
        minOnPath[to] = Math.min(minOnPath[u], w);
        stack.push(to);
      }
    }
  }
  return minOnPath[t];
}

describe('gomoryHuTree', () => {
  it('empty graph', () => {
    expect(gomoryHuTree(0, [])).toEqual([]);
  });

  it('single node', () => {
    expect(gomoryHuTree(1, [])).toEqual([]);
  });

  it('two nodes one edge', () => {
    const t = gomoryHuTree(2, [[0, 1, 5]]);
    expect(t).toHaveLength(1);
    expect(t[0].weight).toBe(5);
  });

  it('triangle K3 with equal weights', () => {
    const t = gomoryHuTree(3, [
      [0, 1, 1],
      [1, 2, 1],
      [0, 2, 1],
    ]);
    for (let i = 0; i < 3; i += 1) {
      for (let j = i + 1; j < 3; j += 1) {
        expect(pathMin(t, 3, i, j)).toBe(2);
      }
    }
  });

  it('chain graph', () => {
    const t = gomoryHuTree(4, [
      [0, 1, 5],
      [1, 2, 3],
      [2, 3, 7],
    ]);
    expect(pathMin(t, 4, 0, 3)).toBe(3);
    expect(pathMin(t, 4, 0, 1)).toBe(5);
    expect(pathMin(t, 4, 2, 3)).toBe(7);
  });

  it('disconnected => weight 0 cut', () => {
    const t = gomoryHuTree(4, [
      [0, 1, 3],
      [2, 3, 4],
    ]);
    expect(pathMin(t, 4, 0, 2)).toBe(0);
  });

  it('returns n-1 edges', () => {
    const t = gomoryHuTree(5, [
      [0, 1, 1],
      [1, 2, 1],
      [2, 3, 1],
      [3, 4, 1],
    ]);
    expect(t).toHaveLength(4);
  });

  it('parallel edges combine', () => {
    const t = gomoryHuTree(2, [
      [0, 1, 2],
      [0, 1, 3],
    ]);
    expect(t[0].weight).toBe(5);
  });

  it('throws on bad inputs', () => {
    expect(() => gomoryHuTree(-1, [])).toThrow();
    expect(() => gomoryHuTree(2, [[0, 5, 1]])).toThrow();
    expect(() => gomoryHuTree(2, [[0, 1, -1]])).toThrow();
  });

  it('matches direct min-cut on small graphs', () => {
    const edges: Array<[number, number, number]> = [
      [0, 1, 4],
      [0, 2, 2],
      [1, 2, 1],
      [1, 3, 3],
      [2, 3, 5],
    ];
    const t = gomoryHuTree(4, edges);
    // Expected pairwise min-cuts: brute force max-flow per pair
    const adj: Array<Array<{ to: number; cap: number; rev: number; flow: number }>> = Array.from({ length: 4 }, () => []);
    for (const [u, v, c] of edges) {
      adj[u].push({ to: v, cap: c, flow: 0, rev: adj[v].length });
      adj[v].push({ to: u, cap: c, flow: 0, rev: adj[u].length - 1 });
    }
    function maxFlow(s: number, sink: number): number {
      for (const list of adj) for (const e of list) e.flow = 0;
      let total = 0;
      while (true) {
        const parent = new Int32Array(4).fill(-1);
        const parentEdge = new Int32Array(4).fill(-1);
        parent[s] = s;
        const q: number[] = [s];
        let augmented = 0;
        while (q.length) {
          const u = q.shift()!;
          for (let i = 0; i < adj[u].length; i += 1) {
            const e = adj[u][i];
            if (parent[e.to] === -1 && e.cap - e.flow > 0) {
              parent[e.to] = u;
              parentEdge[e.to] = i;
              if (e.to === sink) {
                let cur = sink;
                let b = Infinity;
                while (cur !== s) {
                  const p = parent[cur];
                  const ed = adj[p][parentEdge[cur]];
                  b = Math.min(b, ed.cap - ed.flow);
                  cur = p;
                }
                cur = sink;
                while (cur !== s) {
                  const p = parent[cur];
                  const ed = adj[p][parentEdge[cur]];
                  ed.flow += b;
                  adj[cur][ed.rev].flow -= b;
                  cur = p;
                }
                augmented = b;
                q.length = 0;
                break;
              }
              q.push(e.to);
            }
          }
        }
        if (augmented === 0) break;
        total += augmented;
      }
      return total;
    }
    for (let i = 0; i < 4; i += 1) {
      for (let j = i + 1; j < 4; j += 1) {
        expect(pathMin(t, 4, i, j)).toBe(maxFlow(i, j));
      }
    }
  });
});
