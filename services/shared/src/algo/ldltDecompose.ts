export interface LdltResult {
  L: number[][];
  D: number[];
}

export function ldltDecompose(A: number[][]): LdltResult {
  const n = A.length;
  if (n === 0) throw new Error('ldlt: empty matrix');
  for (const row of A) if (row.length !== n) throw new Error('ldlt: A must be square');
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(A[i][j] - A[j][i]) > 1e-9) throw new Error('ldlt: A must be symmetric');
    }
  }
  const L: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
  const D = new Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    let dj = A[j][j];
    for (let k = 0; k < j; k++) dj -= L[j][k] * L[j][k] * D[k];
    if (dj === 0) throw new Error('ldlt: zero pivot');
    D[j] = dj;
    for (let i = j + 1; i < n; i++) {
      let s = A[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k] * D[k];
      L[i][j] = s / dj;
    }
  }
  return { L, D };
}

export function ldltSolve(L: number[][], D: number[], b: number[]): number[] {
  const n = L.length;
  if (D.length !== n) throw new Error('ldltSolve: D size mismatch');
  if (b.length !== n) throw new Error('ldltSolve: b size mismatch');
  const y = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = b[i];
    for (let j = 0; j < i; j++) s -= L[i][j] * y[j];
    y[i] = s;
  }
  const z = y.map((v, i) => {
    if (D[i] === 0) throw new Error('ldltSolve: zero D');
    return v / D[i];
  });
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = z[i];
    for (let j = i + 1; j < n; j++) s -= L[j][i] * x[j];
    x[i] = s;
  }
  return x;
}
