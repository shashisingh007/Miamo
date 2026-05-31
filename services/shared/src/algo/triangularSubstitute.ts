// Forward/back substitution for triangular linear systems.

export function forwardSubstitute(L: number[][], b: number[]): number[] {
  const n = L.length;
  if (n === 0) throw new Error('forwardSubstitute: empty');
  if (b.length !== n) throw new Error('forwardSubstitute: dim mismatch');
  for (const r of L) if (r.length !== n) throw new Error('forwardSubstitute: not square');
  const x = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = b[i];
    for (let j = 0; j < i; j++) s -= L[i][j] * x[j];
    if (L[i][i] === 0) throw new Error('forwardSubstitute: zero diagonal');
    x[i] = s / L[i][i];
  }
  return x;
}

export function backSubstitute(U: number[][], b: number[]): number[] {
  const n = U.length;
  if (n === 0) throw new Error('backSubstitute: empty');
  if (b.length !== n) throw new Error('backSubstitute: dim mismatch');
  for (const r of U) if (r.length !== n) throw new Error('backSubstitute: not square');
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let j = i + 1; j < n; j++) s -= U[i][j] * x[j];
    if (U[i][i] === 0) throw new Error('backSubstitute: zero diagonal');
    x[i] = s / U[i][i];
  }
  return x;
}
