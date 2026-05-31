export interface GmresOptions {
  maxIter?: number;
  tol?: number;
  x0?: number[];
  restart?: number;
}

export interface GmresResult {
  x: number[];
  iters: number;
  residual: number;
  converged: boolean;
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function norm(a: number[]): number {
  return Math.sqrt(dot(a, a));
}

function matVec(A: number[][], x: number[]): number[] {
  const n = A.length;
  const r = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += A[i][j] * x[j];
    r[i] = s;
  }
  return r;
}

export function gmresMethod(A: number[][], b: number[], opts: GmresOptions = {}): GmresResult {
  const n = A.length;
  if (n === 0) throw new Error('gmres: empty matrix');
  for (const row of A) if (row.length !== n) throw new Error('gmres: A must be square');
  if (b.length !== n) throw new Error('gmres: b length mismatch');
  const tol = opts.tol ?? 1e-10;
  const maxIter = opts.maxIter ?? 200;
  const restart = opts.restart ?? Math.min(n, 50);
  if (!(maxIter >= 1)) throw new Error('gmres: maxIter>=1');
  if (!(tol > 0)) throw new Error('gmres: tol>0');
  if (!(restart >= 1)) throw new Error('gmres: restart>=1');
  const x = opts.x0 ? opts.x0.slice() : new Array(n).fill(0);
  if (x.length !== n) throw new Error('gmres: x0 length mismatch');
  const bnorm = Math.max(norm(b), 1e-300);
  let it = 0;
  let residual = 0;
  let converged = false;
  while (it < maxIter) {
    const Ax = matVec(A, x);
    const r0 = b.map((v, i) => v - Ax[i]);
    let beta = norm(r0);
    residual = beta;
    if (beta / bnorm < tol) {
      converged = true;
      break;
    }
    const m = restart;
    const V: number[][] = [];
    V.push(r0.map((v) => v / beta));
    const H: number[][] = Array.from({ length: m + 1 }, () => new Array(m).fill(0));
    const cs: number[] = new Array(m).fill(0);
    const sn: number[] = new Array(m).fill(0);
    const g: number[] = [beta];
    let inner = 0;
    let done = false;
    for (let j = 0; j < m && it < maxIter; j++) {
      inner = j + 1;
      it++;
      let w = matVec(A, V[j]);
      for (let i = 0; i <= j; i++) {
        H[i][j] = dot(w, V[i]);
        for (let k = 0; k < n; k++) w[k] -= H[i][j] * V[i][k];
      }
      H[j + 1][j] = norm(w);
      if (H[j + 1][j] !== 0) {
        V.push(w.map((v) => v / H[j + 1][j]));
      } else {
        V.push(new Array(n).fill(0));
      }
      for (let i = 0; i < j; i++) {
        const t1 = cs[i] * H[i][j] + sn[i] * H[i + 1][j];
        const t2 = -sn[i] * H[i][j] + cs[i] * H[i + 1][j];
        H[i][j] = t1;
        H[i + 1][j] = t2;
      }
      const r1 = H[j][j];
      const r2 = H[j + 1][j];
      const den = Math.hypot(r1, r2) || 1;
      cs[j] = r1 / den;
      sn[j] = r2 / den;
      H[j][j] = cs[j] * r1 + sn[j] * r2;
      H[j + 1][j] = 0;
      g.push(-sn[j] * g[j]);
      g[j] = cs[j] * g[j];
      residual = Math.abs(g[j + 1]);
      if (residual / bnorm < tol) {
        done = true;
        break;
      }
    }
    const y = new Array(inner).fill(0);
    for (let i = inner - 1; i >= 0; i--) {
      let s = g[i];
      for (let k = i + 1; k < inner; k++) s -= H[i][k] * y[k];
      if (H[i][i] === 0) throw new Error('gmres: singular triangular');
      y[i] = s / H[i][i];
    }
    for (let k = 0; k < n; k++) {
      let s = 0;
      for (let i = 0; i < inner; i++) s += V[i][k] * y[i];
      x[k] += s;
    }
    if (done) {
      converged = true;
      break;
    }
  }
  for (const v of x) if (!Number.isFinite(v)) throw new Error('gmres: non-finite');
  return { x, iters: it, residual, converged };
}
