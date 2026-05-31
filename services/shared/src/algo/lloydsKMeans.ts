// Lloyd's k-means clustering: deterministic with seeded initial centroids.
// Inputs: points (n x d), initialCentroids (k x d). Iterates assign/update until
// assignments stabilize or maxIterations is reached.

export interface LloydsResult {
  assignments: number[];
  centroids: number[][];
  iterations: number;
  converged: boolean;
}

function dist2(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return s;
}

export function lloydsKMeans(
  points: number[][],
  initialCentroids: number[][],
  maxIterations: number = 100,
): LloydsResult {
  if (points.length === 0) throw new Error('empty points');
  if (initialCentroids.length === 0) throw new Error('empty centroids');
  if (!Number.isInteger(maxIterations) || maxIterations <= 0) throw new Error('maxIterations must be positive integer');
  const d = points[0].length;
  if (d === 0) throw new Error('zero-dimensional points');
  for (const p of points) if (p.length !== d) throw new Error('inconsistent point dim');
  for (const c of initialCentroids) if (c.length !== d) throw new Error('centroid dim mismatch');

  const k = initialCentroids.length;
  let centroids = initialCentroids.map((c) => c.slice());
  const assignments: number[] = new Array(points.length).fill(-1);
  let converged = false;
  let iter = 0;

  for (iter = 1; iter <= maxIterations; iter++) {
    let changed = false;
    for (let i = 0; i < points.length; i++) {
      let best = 0;
      let bestD = dist2(points[i], centroids[0]);
      for (let j = 1; j < k; j++) {
        const dj = dist2(points[i], centroids[j]);
        if (dj < bestD) { bestD = dj; best = j; }
      }
      if (assignments[i] !== best) { assignments[i] = best; changed = true; }
    }
    if (!changed) { converged = true; break; }

    const sums: number[][] = Array.from({ length: k }, () => new Array(d).fill(0));
    const counts: number[] = new Array(k).fill(0);
    for (let i = 0; i < points.length; i++) {
      const a = assignments[i];
      counts[a]++;
      for (let dd = 0; dd < d; dd++) sums[a][dd] += points[i][dd];
    }
    for (let j = 0; j < k; j++) {
      if (counts[j] === 0) continue;
      for (let dd = 0; dd < d; dd++) centroids[j][dd] = sums[j][dd] / counts[j];
    }
  }

  return { assignments, centroids, iterations: iter > maxIterations ? maxIterations : iter, converged };
}
