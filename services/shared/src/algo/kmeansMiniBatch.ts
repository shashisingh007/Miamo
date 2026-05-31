// Mini-batch k-means clustering.
// Sequential, deterministic given a fixed `rng`. Updates centroids with a
// learning rate proportional to 1/(count of points ever assigned to each cluster).

export interface KMeansMiniBatchOptions {
  k: number;
  batchSize: number;
  maxIterations?: number;
  rng?: () => number;
  initialCentroids?: number[][];
}

export interface KMeansMiniBatchResult {
  centroids: number[][];
  iterations: number;
}

function dist2(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return s;
}

function nearest(centroids: number[][], p: number[]): number {
  let best = 0, bestD = Infinity;
  for (let c = 0; c < centroids.length; c++) {
    const d = dist2(centroids[c], p);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

export function kmeansMiniBatch(points: number[][], opts: KMeansMiniBatchOptions): KMeansMiniBatchResult {
  const { k, batchSize } = opts;
  const maxIt = opts.maxIterations ?? 50;
  const rng = opts.rng ?? Math.random;
  if (!Number.isInteger(k) || k <= 0) throw new Error('k must be a positive integer');
  if (!Number.isInteger(batchSize) || batchSize <= 0) throw new Error('batchSize must be a positive integer');
  if (!Number.isInteger(maxIt) || maxIt <= 0) throw new Error('maxIterations must be a positive integer');
  if (points.length === 0) throw new Error('empty points');
  const dims = points[0].length;
  if (dims === 0) throw new Error('zero-dimensional points');
  for (const p of points) {
    if (p.length !== dims) throw new Error('inconsistent dimensions');
    for (const v of p) if (!Number.isFinite(v)) throw new Error('non-finite coordinate');
  }
  if (points.length < k) throw new Error('fewer points than k');

  let centroids: number[][];
  if (opts.initialCentroids) {
    if (opts.initialCentroids.length !== k) throw new Error('initialCentroids length must equal k');
    centroids = opts.initialCentroids.map((c) => c.slice());
  } else {
    // Pick first k distinct-by-index points as init.
    centroids = points.slice(0, k).map((p) => p.slice());
  }

  const counts = new Array(k).fill(0);
  for (let it = 1; it <= maxIt; it++) {
    for (let b = 0; b < batchSize; b++) {
      const idx = Math.floor(rng() * points.length) % points.length;
      const p = points[idx];
      const c = nearest(centroids, p);
      counts[c] += 1;
      const eta = 1 / counts[c];
      for (let d = 0; d < dims; d++) centroids[c][d] = (1 - eta) * centroids[c][d] + eta * p[d];
    }
  }
  return { centroids, iterations: maxIt };
}
