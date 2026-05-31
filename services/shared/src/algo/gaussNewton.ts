export interface GaussNewtonOptions {
  maxIter?: number;
  tol?: number;
  damping?: number;
}

export interface GaussNewtonResult {
  beta: number[];
  iters: number;
  residual: number;
  converged: boolean;
}

function transposeMul(J: number[][]): number[][] {
  const m = J.length;
  const n = J[0].length;
  const out: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let k = 0; k < m; k++) s += J[k][i] * J[k][j];
      out[i][j] = s;
    }
  }
  return out;
}

function transposeVec(J: number[][], r: number[]): number[] {
  const m = J.length;
  const n = J[0].length;
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < m; k++) s += J[k][i] * r[k];
    out[i] = s;
  }
  return out;
}

function solveLU(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((r) => r.slice());
  const x = b.slice();
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k;
    if (Math.abs(M[p][i]) < 1e-14) throw new Error('gaussNewton: singular normal equations');
    if (p !== i) {
      [M[i], M[p]] = [M[p], M[i]];
      [x[i], x[p]] = [x[p], x[i]];
    }
    for (let k = i + 1; k < n; k++) {
      const f = M[k][i] / M[i][i];
      for (let j = i; j < n; j++) M[k][j] -= f * M[i][j];
      x[k] -= f * x[i];
    }
  }
  const y = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = x[i];
    for (let j = i + 1; j < n; j++) s -= M[i][j] * y[j];
    y[i] = s / M[i][i];
  }
  return y;
}

export function gaussNewton(
  residuals: (beta: number[]) => number[],
  jacobian: (beta: number[]) => number[][],
  beta0: number[],
  opts: GaussNewtonOptions = {},
): GaussNewtonResult {
  const n = beta0.length;
  if (n === 0) throw new Error('gaussNewton: empty beta0');
  const maxIter = opts.maxIter ?? 100;
  const tol = opts.tol ?? 1e-10;
  const damping = opts.damping ?? 0;
  if (!(maxIter >= 1)) throw new Error('gaussNewton: maxIter>=1');
  if (!(tol > 0)) throw new Error('gaussNewton: tol>0');
  if (!(damping >= 0)) throw new Error('gaussNewton: damping>=0');
  const beta = beta0.slice();
  let r = residuals(beta);
  if (!r.length) throw new Error('gaussNewton: residuals empty');
  for (const v of r) if (!Number.isFinite(v)) throw new Error('gaussNewton: non-finite residual');
  let cost = r.reduce((s, v) => s + v * v, 0);
  let it = 0;
  let converged = false;
  for (it = 0; it < maxIter; it++) {
    const J = jacobian(beta);
    if (J.length !== r.length) throw new Error('gaussNewton: J row mismatch');
    for (const row of J) if (row.length !== n) throw new Error('gaussNewton: J col mismatch');
    const JtJ = transposeMul(J);
    if (damping > 0) for (let i = 0; i < n; i++) JtJ[i][i] += damping;
    const Jtr = transposeVec(J, r);
    const negJtr = Jtr.map((v) => -v);
    const dBeta = solveLU(JtJ, negJtr);
    for (let i = 0; i < n; i++) beta[i] += dBeta[i];
    const rNew = residuals(beta);
    for (const v of rNew) if (!Number.isFinite(v)) throw new Error('gaussNewton: non-finite residual');
    const costNew = rNew.reduce((s, v) => s + v * v, 0);
    const stepNorm = Math.sqrt(dBeta.reduce((s, v) => s + v * v, 0));
    r = rNew;
    if (Math.abs(cost - costNew) < tol || stepNorm < tol) {
      cost = costNew;
      converged = true;
      it++;
      break;
    }
    cost = costNew;
  }
  return { beta, iters: it, residual: Math.sqrt(cost), converged };
}
