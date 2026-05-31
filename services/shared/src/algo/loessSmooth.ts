/**
 * LOESS (LOWESS) local polynomial regression with degree 1 (linear).
 * Returns smoothed y values at the same x positions.
 */

export interface LoessOptions {
  bandwidth?: number; // fraction in (0,1] of points used per local fit
  robustnessIters?: number;
}

export function loessSmooth(x: number[], y: number[], opts: LoessOptions = {}): number[] {
  if (x.length !== y.length) throw new Error('x and y length mismatch');
  const n = x.length;
  if (n < 2) throw new Error('need at least 2 points');
  for (let i = 1; i < n; i++) {
    if (x[i] < x[i - 1]) throw new Error('x must be non-decreasing');
  }
  const bandwidth = opts.bandwidth ?? 0.5;
  const robustnessIters = opts.robustnessIters ?? 0;
  if (!(bandwidth > 0 && bandwidth <= 1)) throw new Error('bandwidth must be in (0,1]');
  if (!Number.isInteger(robustnessIters) || robustnessIters < 0) {
    throw new Error('robustnessIters must be non-negative integer');
  }

  const r = Math.max(2, Math.floor(bandwidth * n));
  const robustWeights = new Array(n).fill(1);
  const result = new Array(n);

  for (let iter = 0; iter <= robustnessIters; iter++) {
    for (let i = 0; i < n; i++) {
      // distances from x[i]
      const dist = new Array(n);
      for (let k = 0; k < n; k++) dist[k] = Math.abs(x[k] - x[i]);
      // sort distances to find r-th
      const sorted = dist.slice().sort((a, b) => a - b);
      const h = Math.max(sorted[r - 1], 1e-12);

      let sw = 0;
      let swx = 0;
      let swy = 0;
      let swxx = 0;
      let swxy = 0;
      for (let k = 0; k < n; k++) {
        const u = dist[k] / h;
        if (u >= 1) continue;
        const tri = 1 - u * u * u;
        const w = tri * tri * tri * robustWeights[k];
        sw += w;
        swx += w * x[k];
        swy += w * y[k];
        swxx += w * x[k] * x[k];
        swxy += w * x[k] * y[k];
      }
      const denom = sw * swxx - swx * swx;
      let slope: number;
      let intercept: number;
      if (denom === 0 || sw === 0) {
        slope = 0;
        intercept = sw === 0 ? 0 : swy / sw;
      } else {
        slope = (sw * swxy - swx * swy) / denom;
        intercept = (swy - slope * swx) / sw;
      }
      result[i] = slope * x[i] + intercept;
    }

    if (iter < robustnessIters) {
      const residuals = new Array(n);
      for (let i = 0; i < n; i++) residuals[i] = Math.abs(y[i] - result[i]);
      const sortedRes = residuals.slice().sort((a, b) => a - b);
      const med = sortedRes[Math.floor(n / 2)];
      const s = 6 * med;
      for (let i = 0; i < n; i++) {
        if (s === 0) {
          robustWeights[i] = 1;
        } else {
          const u = residuals[i] / s;
          robustWeights[i] = u >= 1 ? 0 : (1 - u * u) ** 2;
        }
      }
    }
  }
  return result;
}
