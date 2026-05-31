export function tarjanStronglyConnected(graph: number[][]): number[][] {
  const n = graph.length;
  const indexOf = new Array<number>(n).fill(-1);
  const lowlink = new Array<number>(n).fill(0);
  const onStack = new Array<boolean>(n).fill(false);
  const stack: number[] = [];
  const components: number[][] = [];
  let index = 0;

  type Frame = { v: number; i: number };
  const callStack: Frame[] = [];

  for (let s = 0; s < n; s++) {
    if (indexOf[s] !== -1) continue;
    callStack.push({ v: s, i: 0 });
    indexOf[s] = index;
    lowlink[s] = index;
    index += 1;
    stack.push(s);
    onStack[s] = true;

    while (callStack.length > 0) {
      const frame = callStack[callStack.length - 1];
      const { v } = frame;
      const neighbors = graph[v];
      if (frame.i < neighbors.length) {
        const w = neighbors[frame.i++];
        if (w < 0 || w >= n) throw new RangeError(`edge target ${w} out of bounds`);
        if (indexOf[w] === -1) {
          indexOf[w] = index;
          lowlink[w] = index;
          index += 1;
          stack.push(w);
          onStack[w] = true;
          callStack.push({ v: w, i: 0 });
        } else if (onStack[w]) {
          if (indexOf[w] < lowlink[v]) lowlink[v] = indexOf[w];
        }
      } else {
        if (lowlink[v] === indexOf[v]) {
          const comp: number[] = [];
          while (true) {
            const w = stack.pop()!;
            onStack[w] = false;
            comp.push(w);
            if (w === v) break;
          }
          components.push(comp);
        }
        callStack.pop();
        if (callStack.length > 0) {
          const parent = callStack[callStack.length - 1].v;
          if (lowlink[v] < lowlink[parent]) lowlink[parent] = lowlink[v];
        }
      }
    }
  }
  return components;
}
