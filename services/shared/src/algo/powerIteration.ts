export interface PowerIterationResult {
  eigenvalue: number;
  eigenvector: number[];
  iterations: number;
  converged: boolean;
}

export interface PowerIterationOptions {
  maxIterations?: number;
  tolerance?: number;
  initial?: number[];
}

function norm2(v: number[]): number {
  let s = 0;
  for (const x of v) s += x * x;
  return Math.sqrt(s);
}

function matVec(A: number[][], v: number[]): number[] {
  const n = A.length;
  const out = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = 0;
    const row = A[i];
    for (let j = 0; j < n; j++) s += row[j] * v[j];
    out[i] = s;
  }
  return out;
}

export function powerIteration(A: number[][], opts: PowerIterationOptions = {}): PowerIterationResult {
  const n = A.length;
  if (n === 0) throw new Error('empty matrix');
  for (const row of A) if (row.length !== n) throw new Error('matrix must be square');
  const maxIterations = opts.maxIterations ?? 1000;
  const tolerance = opts.tolerance ?? 1e-10;
  let v: number[];
  if (opts.initial) {
    if (opts.initial.length !== n) throw new Error('initial vector size mismatch');
    v = opts.initial.slice();
  } else {
    v = new Array<number>(n).fill(0).map((_, i) => (i === 0 ? 1 : 0));
  }
  let nrm = norm2(v);
  if (nrm === 0) {
    v = v.map((_, i) => (i === 0 ? 1 : 0));
    nrm = 1;
  }
  v = v.map((x) => x / nrm);
  let lambda = 0;
  let converged = false;
  let iter = 0;
  for (iter = 1; iter <= maxIterations; iter++) {
    const w = matVec(A, v);
    const wn = norm2(w);
    if (wn === 0) {
      lambda = 0;
      converged = true;
      break;
    }
    const next = w.map((x) => x / wn);
    let dot = 0;
    for (let i = 0; i < n; i++) dot += next[i] * matVec(A, next)[i];
    const newLambda = dot;
    if (Math.abs(newLambda - lambda) < tolerance && iter > 1) {
      lambda = newLambda;
      v = next;
      converged = true;
      break;
    }
    lambda = newLambda;
    v = next;
  }
  return { eigenvalue: lambda, eigenvector: v, iterations: iter, converged };
}
