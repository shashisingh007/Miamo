export interface SorOptions {
  omega?: number;
  maxIter?: number;
  tol?: number;
  x0?: number[];
}

export interface SorResult {
  x: number[];
  iters: number;
  residual: number;
  converged: boolean;
}

export function sorMethod(A: number[][], b: number[], opts: SorOptions = {}): SorResult {
  const n = A.length;
  if (n === 0) throw new Error('sor: empty matrix');
  for (const row of A) if (row.length !== n) throw new Error('sor: A must be square');
  if (b.length !== n) throw new Error('sor: b length mismatch');
  const omega = opts.omega ?? 1.0;
  if (!(omega > 0 && omega < 2)) throw new Error('sor: omega must be in (0,2)');
  const maxIter = opts.maxIter ?? 1000;
  const tol = opts.tol ?? 1e-10;
  if (!(maxIter >= 1)) throw new Error('sor: maxIter>=1');
  if (!(tol > 0)) throw new Error('sor: tol>0');
  const x = opts.x0 ? opts.x0.slice() : new Array(n).fill(0);
  if (x.length !== n) throw new Error('sor: x0 length mismatch');
  for (let i = 0; i < n; i++) if (A[i][i] === 0) throw new Error('sor: zero diagonal');
  let residual = Infinity;
  let it = 0;
  let converged = false;
  for (it = 0; it < maxIter; it++) {
    for (let i = 0; i < n; i++) {
      let sigma = 0;
      for (let j = 0; j < n; j++) if (j !== i) sigma += A[i][j] * x[j];
      x[i] = (1 - omega) * x[i] + (omega / A[i][i]) * (b[i] - sigma);
    }
    let r = 0;
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < n; j++) s += A[i][j] * x[j];
      const d = s - b[i];
      r += d * d;
    }
    residual = Math.sqrt(r);
    if (residual < tol) {
      converged = true;
      it++;
      break;
    }
  }
  for (const v of x) if (!Number.isFinite(v)) throw new Error('sor: divergence (non-finite)');
  return { x, iters: it, residual, converged };
}
