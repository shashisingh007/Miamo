function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

function pad(A: number[][], n: number): number[][] {
  const m = A.length;
  if (m === n && A[0].length === n) return A;
  const out: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n).fill(0);
    if (i < m) for (let j = 0; j < Math.min(A[i].length, n); j++) row[j] = A[i][j];
    out.push(row);
  }
  return out;
}

function add(A: number[][], B: number[][]): number[][] {
  const n = A.length;
  const C: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n);
    for (let j = 0; j < n; j++) row[j] = A[i][j] + B[i][j];
    C.push(row);
  }
  return C;
}

function sub(A: number[][], B: number[][]): number[][] {
  const n = A.length;
  const C: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n);
    for (let j = 0; j < n; j++) row[j] = A[i][j] - B[i][j];
    C.push(row);
  }
  return C;
}

function naiveMul(A: number[][], B: number[][]): number[][] {
  const n = A.length;
  const C: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < n; k++) {
      const a = A[i][k];
      for (let j = 0; j < n; j++) C[i][j] += a * B[k][j];
    }
  }
  return C;
}

function strassenRec(A: number[][], B: number[][]): number[][] {
  const n = A.length;
  if (n <= 64) return naiveMul(A, B);
  const h = n >> 1;
  const split = (M: number[][]) => {
    const M11: number[][] = [];
    const M12: number[][] = [];
    const M21: number[][] = [];
    const M22: number[][] = [];
    for (let i = 0; i < h; i++) {
      M11.push(M[i].slice(0, h));
      M12.push(M[i].slice(h));
      M21.push(M[i + h].slice(0, h));
      M22.push(M[i + h].slice(h));
    }
    return [M11, M12, M21, M22];
  };
  const [A11, A12, A21, A22] = split(A);
  const [B11, B12, B21, B22] = split(B);
  const M1 = strassenRec(add(A11, A22), add(B11, B22));
  const M2 = strassenRec(add(A21, A22), B11);
  const M3 = strassenRec(A11, sub(B12, B22));
  const M4 = strassenRec(A22, sub(B21, B11));
  const M5 = strassenRec(add(A11, A12), B22);
  const M6 = strassenRec(sub(A21, A11), add(B11, B12));
  const M7 = strassenRec(sub(A12, A22), add(B21, B22));
  const C11 = add(sub(add(M1, M4), M5), M7);
  const C12 = add(M3, M5);
  const C21 = add(M2, M4);
  const C22 = add(sub(add(M1, M3), M2), M6);
  const C: number[][] = [];
  for (let i = 0; i < h; i++) C.push([...C11[i], ...C12[i]]);
  for (let i = 0; i < h; i++) C.push([...C21[i], ...C22[i]]);
  return C;
}

export function strassenMultiply(A: number[][], B: number[][]): number[][] {
  if (A.length === 0 || B.length === 0) throw new Error('strassen: empty matrix');
  const aRows = A.length;
  const aCols = A[0].length;
  const bRows = B.length;
  const bCols = B[0].length;
  for (const row of A) if (row.length !== aCols) throw new Error('strassen: A rows uneven');
  for (const row of B) if (row.length !== bCols) throw new Error('strassen: B rows uneven');
  if (aCols !== bRows) throw new Error('strassen: dimension mismatch');
  const n = nextPow2(Math.max(aRows, aCols, bRows, bCols));
  const Ap = pad(A, n);
  const Bp = pad(B, n);
  const Cp = strassenRec(Ap, Bp);
  const C: number[][] = [];
  for (let i = 0; i < aRows; i++) C.push(Cp[i].slice(0, bCols));
  return C;
}
