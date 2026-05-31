export interface FloydWarshallResult {
  distance: number[][];
  hasNegativeCycle: boolean;
}

export function floydWarshallAllPairs(weightMatrix: number[][]): FloydWarshallResult {
  const n = weightMatrix.length;
  if (n === 0) return { distance: [], hasNegativeCycle: false };
  for (const row of weightMatrix) {
    if (row.length !== n) throw new RangeError('weightMatrix must be square');
  }
  const dist: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array<number>(n);
    for (let j = 0; j < n; j++) row[j] = weightMatrix[i][j];
    dist.push(row);
  }
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      if (dist[i][k] === Infinity) continue;
      for (let j = 0; j < n; j++) {
        if (dist[k][j] === Infinity) continue;
        const via = dist[i][k] + dist[k][j];
        if (via < dist[i][j]) dist[i][j] = via;
      }
    }
  }
  let hasNegativeCycle = false;
  for (let i = 0; i < n; i++) {
    if (dist[i][i] < 0) {
      hasNegativeCycle = true;
      break;
    }
  }
  return { distance: dist, hasNegativeCycle };
}
