export interface LMResult {
  params: number[];
  iterations: number;
  cost: number;
  converged: boolean;
}

export interface LMOptions {
  maxIter?: number;
  tol?: number;
  lambda0?: number;
  lambdaUp?: number;
  lambdaDown?: number;
  epsJac?: number;
}

function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  const M: number[][] = A.map((row, i) => [...row, b[i]]);
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
    if (Math.abs(M[p][k]) < 1e-14) return null;
    if (p !== k) [M[k], M[p]] = [M[p], M[k]];
    for (let i = k + 1; i < n; i++) {
      const f = M[i][k] / M[k][k];
      for (let j = k; j <= n; j++) M[i][j] -= f * M[k][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j];
    x[i] = s / M[i][i];
  }
  return x;
}

function computeResiduals(f: (p: number[]) => number[], p: number[]): number[] {
  return f(p);
}

function cost(r: number[]): number {
  let s = 0;
  for (const v of r) s += v * v;
  return s;
}

function numericalJacobian(
  f: (p: number[]) => number[],
  p: number[],
  r0: number[],
  eps: number,
): number[][] {
  const m = r0.length;
  const n = p.length;
  const J: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let j = 0; j < n; j++) {
    const h = eps * Math.max(1, Math.abs(p[j]));
    const pp = p.slice();
    pp[j] += h;
    const r1 = f(pp);
    for (let i = 0; i < m; i++) J[i][j] = (r1[i] - r0[i]) / h;
  }
  return J;
}

export function levenbergMarquardt(
  residualsFn: (p: number[]) => number[],
  initial: number[],
  options: LMOptions = {},
): LMResult {
  if (typeof residualsFn !== 'function') throw new Error('levenbergMarquardt: residualsFn required');
  if (!Array.isArray(initial) || initial.length === 0)
    throw new Error('levenbergMarquardt: initial params required');
  const maxIter = options.maxIter ?? 200;
  const tol = options.tol ?? 1e-10;
  let lambda = options.lambda0 ?? 1e-3;
  const lambdaUp = options.lambdaUp ?? 10;
  const lambdaDown = options.lambdaDown ?? 10;
  const epsJac = options.epsJac ?? 1e-7;

  let p = initial.slice();
  let r = computeResiduals(residualsFn, p);
  let c = cost(r);
  const n = p.length;
  let converged = false;
  let iter = 0;

  for (; iter < maxIter; iter++) {
    const J = numericalJacobian(residualsFn, p, r, epsJac);
    const m = r.length;
    // JTJ
    const JTJ: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const JTr: number[] = new Array(n).fill(0);
    for (let i = 0; i < m; i++) {
      for (let a = 0; a < n; a++) {
        JTr[a] += J[i][a] * r[i];
        for (let b = 0; b < n; b++) JTJ[a][b] += J[i][a] * J[i][b];
      }
    }
    let solved = false;
    for (let attempt = 0; attempt < 30 && !solved; attempt++) {
      const A: number[][] = JTJ.map((row, i) => {
        const cp = row.slice();
        cp[i] += lambda * (JTJ[i][i] === 0 ? 1 : JTJ[i][i]);
        return cp;
      });
      const b = JTr.map((v) => -v);
      const delta = solveLinear(A, b);
      if (!delta) {
        lambda *= lambdaUp;
        continue;
      }
      const pNew = p.map((v, i) => v + delta[i]);
      const rNew = computeResiduals(residualsFn, pNew);
      const cNew = cost(rNew);
      if (cNew < c) {
        const stepNorm = Math.sqrt(delta.reduce((s, v) => s + v * v, 0));
        const pNorm = Math.sqrt(p.reduce((s, v) => s + v * v, 0)) || 1;
        p = pNew;
        r = rNew;
        const dc = c - cNew;
        c = cNew;
        lambda /= lambdaDown;
        solved = true;
        if (stepNorm / pNorm < tol || dc < tol) {
          converged = true;
        }
        break;
      } else {
        lambda *= lambdaUp;
      }
    }
    if (!solved) break;
    if (converged) {
      iter++;
      break;
    }
  }
  return { params: p, iterations: iter, cost: c, converged };
}
