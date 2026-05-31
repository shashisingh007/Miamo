function clone(A: number[][]): number[][] {
  return A.map((r) => r.slice());
}

function eye(n: number): number[][] {
  const I: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n).fill(0);
    row[i] = 1;
    I.push(row);
  }
  return I;
}

export interface HessenbergResult {
  H: number[][];
  Q: number[][];
}

export function hessenbergReduce(A: number[][]): HessenbergResult {
  const n = A.length;
  if (n === 0) throw new Error('hessenbergReduce: empty');
  for (const r of A) if (r.length !== n) throw new Error('hessenbergReduce: not square');
  const H = clone(A);
  const Q = eye(n);
  for (let k = 0; k < n - 2; k++) {
    let normSq = 0;
    for (let i = k + 1; i < n; i++) normSq += H[i][k] * H[i][k];
    const norm = Math.sqrt(normSq);
    if (norm === 0) continue;
    const sign = H[k + 1][k] >= 0 ? 1 : -1;
    const v: number[] = new Array(n).fill(0);
    v[k + 1] = H[k + 1][k] + sign * norm;
    for (let i = k + 2; i < n; i++) v[i] = H[i][k];
    let vNormSq = 0;
    for (let i = k + 1; i < n; i++) vNormSq += v[i] * v[i];
    if (vNormSq === 0) continue;
    const beta = 2 / vNormSq;
    // H = (I - beta v v^T) H (I - beta v v^T)
    // Left
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let i = k + 1; i < n; i++) s += v[i] * H[i][j];
      s *= beta;
      for (let i = k + 1; i < n; i++) H[i][j] -= s * v[i];
    }
    // Right
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = k + 1; j < n; j++) s += H[i][j] * v[j];
      s *= beta;
      for (let j = k + 1; j < n; j++) H[i][j] -= s * v[j];
    }
    // Q = Q (I - beta v v^T)
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = k + 1; j < n; j++) s += Q[i][j] * v[j];
      s *= beta;
      for (let j = k + 1; j < n; j++) Q[i][j] -= s * v[j];
    }
  }
  // Zero numerical noise below subdiagonal
  for (let i = 2; i < n; i++) {
    for (let j = 0; j < i - 1; j++) H[i][j] = 0;
  }
  return { H, Q };
}
