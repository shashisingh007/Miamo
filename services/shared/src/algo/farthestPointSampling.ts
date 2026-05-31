// Greedy farthest-point sampling. Selects k points from a set so that each
// next pick maximizes the minimum distance to all previously chosen points.
// Returns the indices of the selected points in selection order.

export interface Point {
  x: number;
  y: number;
}

function dist2(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function farthestPointSampling(points: Point[], k: number, startIndex = 0): number[] {
  const n = points.length;
  if (!Number.isInteger(k) || k < 0) throw new RangeError('k must be a non-negative integer');
  if (k > n) throw new RangeError('k cannot exceed the number of points');
  if (!Number.isInteger(startIndex) || startIndex < 0 || startIndex >= n) {
    if (n === 0 && k === 0) return [];
    throw new RangeError('startIndex out of range');
  }
  if (k === 0) return [];
  const selected: number[] = [startIndex];
  const minD = new Array<number>(n).fill(Infinity);
  for (let i = 0; i < n; i++) minD[i] = dist2(points[i], points[startIndex]);
  while (selected.length < k) {
    let best = -1;
    let bestD = -1;
    for (let i = 0; i < n; i++) {
      if (minD[i] > bestD) {
        bestD = minD[i];
        best = i;
      }
    }
    selected.push(best);
    for (let i = 0; i < n; i++) {
      const d = dist2(points[i], points[best]);
      if (d < minD[i]) minD[i] = d;
    }
  }
  return selected;
}
