export interface KosarajuResult {
  componentCount: number;
  componentOf: number[];
  components: number[][];
}

export function kosarajuStronglyConnected(
  nodeCount: number,
  edges: Array<[number, number]>
): KosarajuResult {
  if (nodeCount < 0 || !Number.isInteger(nodeCount)) {
    throw new RangeError('nodeCount must be a non-negative integer');
  }
  const adj: number[][] = [];
  const radj: number[][] = [];
  for (let i = 0; i < nodeCount; i++) {
    adj.push([]);
    radj.push([]);
  }
  for (const [u, v] of edges) {
    if (u < 0 || u >= nodeCount || v < 0 || v >= nodeCount) {
      throw new RangeError('edge endpoint out of bounds');
    }
    adj[u].push(v);
    radj[v].push(u);
  }

  const visited = new Array<boolean>(nodeCount).fill(false);
  const order: number[] = [];

  for (let start = 0; start < nodeCount; start++) {
    if (visited[start]) continue;
    const stack: Array<{ node: number; idx: number }> = [{ node: start, idx: 0 }];
    visited[start] = true;
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const neighbors = adj[frame.node];
      if (frame.idx < neighbors.length) {
        const next = neighbors[frame.idx++];
        if (!visited[next]) {
          visited[next] = true;
          stack.push({ node: next, idx: 0 });
        }
      } else {
        order.push(frame.node);
        stack.pop();
      }
    }
  }

  const componentOf = new Array<number>(nodeCount).fill(-1);
  const components: number[][] = [];
  for (let i = order.length - 1; i >= 0; i--) {
    const root = order[i];
    if (componentOf[root] !== -1) continue;
    const comp: number[] = [];
    const id = components.length;
    const dfs = [root];
    componentOf[root] = id;
    while (dfs.length > 0) {
      const u = dfs.pop()!;
      comp.push(u);
      for (const v of radj[u]) {
        if (componentOf[v] === -1) {
          componentOf[v] = id;
          dfs.push(v);
        }
      }
    }
    comp.sort((a, b) => a - b);
    components.push(comp);
  }

  return { componentCount: components.length, componentOf, components };
}
