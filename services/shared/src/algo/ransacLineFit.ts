/**
 * RANSAC line fitting for 2D points.
 * Returns slope/intercept of best line and inlier indices.
 */

export interface Pt2 {
  x: number;
  y: number;
}

export interface RansacLineResult {
  slope: number;
  intercept: number;
  inliers: number[];
}

export interface RansacOptions {
  iterations?: number;
  threshold?: number;
  minInliers?: number;
  rng?: () => number;
}

export function ransacLineFit(points: Pt2[], opts: RansacOptions = {}): RansacLineResult {
  if (!Array.isArray(points)) throw new Error('points must be array');
  if (points.length < 2) throw new Error('need at least 2 points');
  const iterations = opts.iterations ?? 200;
  const threshold = opts.threshold ?? 0.5;
  const minInliers = opts.minInliers ?? 2;
  const rng = opts.rng ?? Math.random;
  if (!Number.isInteger(iterations) || iterations < 1) throw new Error('iterations must be positive integer');
  if (!(threshold > 0)) throw new Error('threshold must be positive');
  if (!Number.isInteger(minInliers) || minInliers < 2) throw new Error('minInliers must be integer >= 2');

  let bestInliers: number[] = [];
  let bestSlope = 0;
  let bestIntercept = 0;

  for (let it = 0; it < iterations; it++) {
    const i = Math.floor(rng() * points.length);
    let j = Math.floor(rng() * points.length);
    if (j === i) j = (i + 1) % points.length;
    const p1 = points[i];
    const p2 = points[j];
    if (p2.x === p1.x) continue;
    const slope = (p2.y - p1.y) / (p2.x - p1.x);
    const intercept = p1.y - slope * p1.x;

    const inliers: number[] = [];
    for (let k = 0; k < points.length; k++) {
      const p = points[k];
      const d = Math.abs(p.y - (slope * p.x + intercept)) / Math.sqrt(1 + slope * slope);
      if (d <= threshold) inliers.push(k);
    }
    if (inliers.length > bestInliers.length) {
      bestInliers = inliers;
      bestSlope = slope;
      bestIntercept = intercept;
    }
  }

  if (bestInliers.length < minInliers) {
    throw new Error(`no model with >= ${minInliers} inliers found`);
  }

  // refit by least squares on inliers
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  const n = bestInliers.length;
  for (const k of bestInliers) {
    const p = points[k];
    sx += p.x;
    sy += p.y;
    sxx += p.x * p.x;
    sxy += p.x * p.y;
  }
  const denom = n * sxx - sx * sx;
  if (denom !== 0) {
    bestSlope = (n * sxy - sx * sy) / denom;
    bestIntercept = (sy - bestSlope * sx) / n;
  }
  return { slope: bestSlope, intercept: bestIntercept, inliers: bestInliers };
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
