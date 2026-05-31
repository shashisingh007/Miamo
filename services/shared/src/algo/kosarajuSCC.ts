export interface KosarajuResult {
  componentOf: number[];
  components: number[][];
}

export function kosarajuSCC(adjacency: number[][]): KosarajuResult {
  const n = adjacency.length;
  if (n === 0) return { componentOf: [], components: [] };

  for (const row of adjacency) {
    for (const v of row) {
      if (v < 0 || v >= n) throw new RangeError('edge endpoint out of bounds');
    }
  }

  const visited = new Array<boolean>(n).fill(false);
  const order: number[] = [];

  for (let start = 0; start < n; start++) {
    if (visited[start]) continue;
    const stack: Array<{ node: number; idx: number }> = [{ node: start, idx: 0 }];
    visited[start] = true;
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const neighbors = adjacency[top.node];
      if (top.idx < neighbors.length) {
        const next = neighbors[top.idx++];
        if (!visited[next]) {
          visited[next] = true;
          stack.push({ node: next, idx: 0 });
        }
      } else {
        order.push(top.node);
        stack.pop();
      }
    }
  }

  const reverse: number[][] = [];
  for (let i = 0; i < n; i++) reverse.push([]);
  for (let u = 0; u < n; u++) for (const v of adjacency[u]) reverse[v].push(u);

  const componentOf = new Array<number>(n).fill(-1);
  const components: number[][] = [];
  for (let i = order.length - 1; i >= 0; i--) {
    const root = order[i];
    if (componentOf[root] !== -1) continue;
    const id = components.length;
    const comp: number[] = [];
    const stack = [root];
    componentOf[root] = id;
    while (stack.length > 0) {
      const u = stack.pop()!;
      comp.push(u);
      for (const v of reverse[u]) {
        if (componentOf[v] === -1) {
          componentOf[v] = id;
          stack.push(v);
        }
      }
    }
    comp.sort((a, b) => a - b);
    components.push(comp);
  }
  return { componentOf, components };
}
