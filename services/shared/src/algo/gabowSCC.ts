// Gabow's path-based strongly-connected-components algorithm. Returns the SCCs
// sorted internally and in reverse-topological order (sinks first), matching
// the convention used by other SCC implementations in this module.
//
// Iterative DFS keeps two stacks:
//   S — vertices on the current DFS path
//   P — boundary stack of "candidate component starts"
// When the DFS retreats past a vertex equal to top of P, all vertices popped
// off S above that point form an SCC.

export function gabowSCC(n: number, adj: number[][]): number[][] {
  if (!Number.isInteger(n) || n < 0) throw new RangeError('n must be a non-negative integer');
  if (!Array.isArray(adj) || adj.length !== n) throw new RangeError('adj must have length n');
  for (let i = 0; i < n; i += 1) {
    if (!Array.isArray(adj[i])) throw new TypeError(`adj[${i}] must be an array`);
    for (const w of adj[i]) {
      if (!Number.isInteger(w) || w < 0 || w >= n) throw new RangeError(`adj[${i}] out of range: ${w}`);
    }
  }
  if (n === 0) return [];

  const preorder: number[] = new Array(n).fill(-1);
  const assigned: boolean[] = new Array(n).fill(false);
  const compOf: number[] = new Array(n).fill(-1);
  let counter = 0;
  const S: number[] = []; // path stack
  const P: number[] = []; // boundary stack
  const components: number[][] = [];

  type Frame = { v: number; iter: number };
  for (let start = 0; start < n; start += 1) {
    if (preorder[start] !== -1) continue;
    const callStack: Frame[] = [];
    preorder[start] = counter++;
    S.push(start);
    P.push(start);
    callStack.push({ v: start, iter: 0 });
    while (callStack.length > 0) {
      const top = callStack[callStack.length - 1];
      const neighbors = adj[top.v];
      if (top.iter < neighbors.length) {
        const w = neighbors[top.iter];
        top.iter += 1;
        if (preorder[w] === -1) {
          preorder[w] = counter++;
          S.push(w);
          P.push(w);
          callStack.push({ v: w, iter: 0 });
        } else if (!assigned[w]) {
          // back/cross edge to a vertex still in S — collapse boundary stack.
          while (P.length > 0 && preorder[P[P.length - 1]] > preorder[w]) {
            P.pop();
          }
        }
        // else: w already assigned to a finished SCC; ignore.
      } else {
        // Done with v. If v is top of P, pop a component.
        if (P.length > 0 && P[P.length - 1] === top.v) {
          const comp: number[] = [];
          while (S.length > 0) {
            const u = S.pop()!;
            assigned[u] = true;
            compOf[u] = components.length;
            comp.push(u);
            if (u === top.v) break;
          }
          P.pop();
          comp.sort((a, b) => a - b);
          components.push(comp);
        }
        callStack.pop();
      }
    }
  }

  // components are appended in finish order; that is already reverse-topological
  // (sinks first). Stable as-is.
  return components;
}
