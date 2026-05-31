/**
 * Geometric median (L1 multivariate median) via Weiszfeld's iteration.
 * Returns the point minimizing sum of Euclidean distances to input points.
 */
export interface GeometricMedianOptions {
  maxIter?: number;
  tol?: number;
}

export function geometricMedian(
  points: number[][],
  opts: GeometricMedianOptions = {}
): number[] {
  if (!Array.isArray(points)) throw new Error('geometricMedian: points must be array');
  if (points.length === 0) throw new Error('geometricMedian: empty input');
  const d = points[0].length;
  if (d === 0) throw new Error('geometricMedian: zero-dimensional points');
  for (const p of points) {
    if (!Array.isArray(p) || p.length !== d) throw new Error('geometricMedian: ragged input');
    for (const v of p) if (!Number.isFinite(v)) throw new Error('geometricMedian: non-finite');
  }
  const maxIter = opts.maxIter ?? 200;
  const tol = opts.tol ?? 1e-9;
  if (maxIter <= 0 || !Number.isFinite(maxIter)) throw new Error('geometricMedian: bad maxIter');
  if (tol < 0 || !Number.isFinite(tol)) throw new Error('geometricMedian: bad tol');

  // Initialize with centroid.
  const x = new Array(d).fill(0);
  for (const p of points) for (let i = 0; i < d; i++) x[i] += p[i];
  for (let i = 0; i < d; i++) x[i] /= points.length;

  for (let iter = 0; iter < maxIter; iter++) {
    let wsum = 0;
    const num = new Array(d).fill(0);
    let coincident = false;
    for (const p of points) {
      let dist = 0;
      for (let i = 0; i < d; i++) {
        const diff = x[i] - p[i];
        dist += diff * diff;
      }
      dist = Math.sqrt(dist);
      if (dist < 1e-12) {
        coincident = true;
        continue;
      }
      const w = 1 / dist;
      wsum += w;
      for (let i = 0; i < d; i++) num[i] += w * p[i];
    }
    if (wsum === 0) return x;
    const next = new Array(d);
    for (let i = 0; i < d; i++) next[i] = num[i] / wsum;
    let delta = 0;
    for (let i = 0; i < d; i++) {
      const diff = next[i] - x[i];
      delta += diff * diff;
      x[i] = next[i];
    }
    if (Math.sqrt(delta) < tol) break;
    if (coincident) break;
  }
  return x;
}
