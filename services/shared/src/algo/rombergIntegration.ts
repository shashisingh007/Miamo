import { trapezoidalRule } from './trapezoidalRule';

export interface RombergOptions {
  maxLevels?: number;
  tol?: number;
}

export interface RombergResult {
  value: number;
  levels: number;
  converged: boolean;
}

export function rombergIntegration(
  f: (x: number) => number,
  a: number,
  b: number,
  opts: RombergOptions = {},
): RombergResult {
  const maxLevels = opts.maxLevels ?? 10;
  const tol = opts.tol ?? 1e-10;
  if (maxLevels < 1 || !Number.isInteger(maxLevels)) {
    throw new Error('rombergIntegration: maxLevels must be a positive integer');
  }
  if (a === b) return { value: 0, levels: 0, converged: true };
  const R: number[][] = [];
  for (let k = 0; k < maxLevels; k += 1) {
    R.push([]);
    const n = 1 << k;
    R[k][0] = trapezoidalRule(f, a, b, n);
    for (let j = 1; j <= k; j += 1) {
      const p = 4 ** j;
      R[k][j] = (p * R[k][j - 1] - R[k - 1][j - 1]) / (p - 1);
    }
    if (k > 0 && Math.abs(R[k][k] - R[k - 1][k - 1]) < tol) {
      return { value: R[k][k], levels: k + 1, converged: true };
    }
  }
  const last = R[maxLevels - 1][maxLevels - 1];
  return { value: last, levels: maxLevels, converged: false };
}
