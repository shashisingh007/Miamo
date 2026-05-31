import { goldenSectionSearch } from './goldenSectionSearch';

export interface PowellOptions {
  maxIter?: number;
  tol?: number;
  bracket?: number;
}

export interface PowellResult {
  x: number[];
  fx: number;
  iters: number;
  converged: boolean;
}

function lineSearch(f: (x: number[]) => number, x: number[], d: number[], bracket: number, tol: number): { alpha: number; fx: number } {
  const phi = (a: number) => f(x.map((v, i) => v + a * d[i]));
  const r = goldenSectionSearch(phi, -bracket, bracket, { tol, maxIter: 200 });
  return { alpha: r.x, fx: r.fx };
}

export function powellMethod(
  f: (x: number[]) => number,
  x0: number[],
  opts: PowellOptions = {},
): PowellResult {
  const n = x0.length;
  if (n === 0) throw new Error('powellMethod: empty x0');
  const maxIter = opts.maxIter ?? 200;
  const tol = opts.tol ?? 1e-8;
  const bracket = opts.bracket ?? 1;
  if (!(maxIter >= 1)) throw new Error('powellMethod: maxIter>=1');
  if (!(tol > 0)) throw new Error('powellMethod: tol>0');
  if (!(bracket > 0)) throw new Error('powellMethod: bracket>0');
  const dirs: number[][] = Array.from({ length: n }, (_, i) => {
    const d = new Array(n).fill(0);
    d[i] = 1;
    return d;
  });
  let x = x0.slice();
  let fx = f(x);
  if (!Number.isFinite(fx)) throw new Error('powellMethod: non-finite f');
  let it = 0;
  let converged = false;
  for (it = 0; it < maxIter; it++) {
    const xStart = x.slice();
    const fStart = fx;
    let maxDelta = 0;
    let idxMax = 0;
    for (let i = 0; i < n; i++) {
      const fBefore = fx;
      const ls = lineSearch(f, x, dirs[i], bracket, tol);
      x = x.map((v, j) => v + ls.alpha * dirs[i][j]);
      fx = ls.fx;
      const delta = fBefore - fx;
      if (delta > maxDelta) {
        maxDelta = delta;
        idxMax = i;
      }
    }
    if (Math.abs(fStart - fx) < tol) {
      converged = true;
      it++;
      break;
    }
    const newDir = x.map((v, i) => v - xStart[i]);
    const dnorm = Math.sqrt(newDir.reduce((s, v) => s + v * v, 0));
    if (dnorm > 0) {
      const ls = lineSearch(f, x, newDir, bracket, tol);
      x = x.map((v, j) => v + ls.alpha * newDir[j]);
      fx = ls.fx;
      dirs[idxMax] = dirs[n - 1];
      dirs[n - 1] = newDir.map((v) => v / dnorm);
    }
  }
  return { x, fx, iters: it, converged };
}
