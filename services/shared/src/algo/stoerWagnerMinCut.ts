export interface StoerWagnerResult {
  minCutWeight: number;
  partition: { sideA: number[]; sideB: number[] };
}

export function stoerWagnerMinCut(weightMatrix: number[][]): StoerWagnerResult {
  const n = weightMatrix.length;
  if (n < 2) throw new RangeError('graph must have >= 2 vertices');
  for (const row of weightMatrix) {
    if (row.length !== n) throw new RangeError('weightMatrix must be square');
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (weightMatrix[i][j] !== weightMatrix[j][i]) {
        throw new RangeError('weightMatrix must be symmetric');
      }
      if (weightMatrix[i][j] < 0) throw new RangeError('negative weight');
    }
  }

  const w: number[][] = weightMatrix.map((r) => r.slice());
  const vertices: number[][] = [];
  for (let i = 0; i < n; i++) vertices.push([i]);
  const alive = new Array<boolean>(n).fill(true);

  let bestCut = Infinity;
  let bestPartition: { sideA: number[]; sideB: number[] } = { sideA: [], sideB: [] };

  let liveCount = n;
  while (liveCount > 1) {
    const added = new Array<boolean>(n).fill(false);
    const weights = new Array<number>(n).fill(0);
    let prev = -1;
    let last = -1;
    for (let phase = 0; phase < liveCount; phase++) {
      let pick = -1;
      let pickW = -Infinity;
      for (let i = 0; i < n; i++) {
        if (alive[i] && !added[i] && weights[i] > pickW) {
          pickW = weights[i];
          pick = i;
        }
      }
      if (pick === -1) break;
      added[pick] = true;
      if (phase === liveCount - 1) {
        if (pickW < bestCut) {
          bestCut = pickW;
          const sideA = vertices[pick].slice();
          const sideB: number[] = [];
          for (let i = 0; i < n; i++) {
            if (alive[i] && i !== pick) for (const v of vertices[i]) sideB.push(v);
          }
          bestPartition = { sideA: sideA.sort((a, b) => a - b), sideB: sideB.sort((a, b) => a - b) };
        }
        last = pick;
      } else {
        prev = pick;
      }
      for (let i = 0; i < n; i++) {
        if (alive[i] && !added[i]) weights[i] += w[pick][i];
      }
    }
    if (prev === -1 || last === -1) break;
    for (let i = 0; i < n; i++) {
      if (alive[i] && i !== prev && i !== last) {
        w[prev][i] += w[last][i];
        w[i][prev] += w[i][last];
      }
    }
    for (const v of vertices[last]) vertices[prev].push(v);
    vertices[last] = [];
    alive[last] = false;
    liveCount -= 1;
  }
  return { minCutWeight: bestCut, partition: bestPartition };
}
