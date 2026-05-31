// Tarjan's strongly connected components: single-pass DFS using lowlink stack.
// Returns components in reverse topological order (sinks first).

export interface TarjanGraph {
  nodeCount: number;
  edges: ReadonlyArray<readonly [number, number]>; // directed (u -> v)
}

export function tarjanSCC(graph: TarjanGraph): number[][] {
  if (!graph || !Number.isInteger(graph.nodeCount) || graph.nodeCount < 0) {
    throw new RangeError('graph.nodeCount must be a non-negative integer');
  }
  if (!Array.isArray(graph.edges)) throw new TypeError('graph.edges must be an array');
  const n = graph.nodeCount;
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const e of graph.edges) {
    const [u, v] = e;
    if (!Number.isInteger(u) || u < 0 || u >= n) throw new RangeError(`bad edge source ${u}`);
    if (!Number.isInteger(v) || v < 0 || v >= n) throw new RangeError(`bad edge target ${v}`);
    adj[u].push(v);
  }
  const index = new Array<number>(n).fill(-1);
  const lowlink = new Array<number>(n).fill(0);
  const onStack = new Array<boolean>(n).fill(false);
  const stack: number[] = [];
  const result: number[][] = [];
  let counter = 0;

  // iterative DFS to avoid stack overflow on large graphs
  for (let root = 0; root < n; root += 1) {
    if (index[root] !== -1) continue;
    const callStack: { v: number; iter: number }[] = [{ v: root, iter: 0 }];
    index[root] = counter;
    lowlink[root] = counter;
    counter += 1;
    stack.push(root);
    onStack[root] = true;

    while (callStack.length > 0) {
      const frame = callStack[callStack.length - 1];
      const { v } = frame;
      if (frame.iter < adj[v].length) {
        const w = adj[v][frame.iter];
        frame.iter += 1;
        if (index[w] === -1) {
          index[w] = counter;
          lowlink[w] = counter;
          counter += 1;
          stack.push(w);
          onStack[w] = true;
          callStack.push({ v: w, iter: 0 });
        } else if (onStack[w]) {
          if (index[w] < lowlink[v]) lowlink[v] = index[w];
        }
      } else {
        // post-order
        callStack.pop();
        if (callStack.length > 0) {
          const parent = callStack[callStack.length - 1].v;
          if (lowlink[v] < lowlink[parent]) lowlink[parent] = lowlink[v];
        }
        if (lowlink[v] === index[v]) {
          const comp: number[] = [];
          while (true) {
            const w = stack.pop()!;
            onStack[w] = false;
            comp.push(w);
            if (w === v) break;
          }
          comp.sort((a, b) => a - b);
          result.push(comp);
        }
      }
    }
  }
  return result;
}
