// Single Kalman filter step for a multivariate linear-Gaussian system.
// Predict + update given:
//   x: n-state mean prior
//   P: n x n state covariance prior
//   F: n x n state transition
//   Q: n x n process noise covariance
//   z: m measurement
//   H: m x n observation
//   R: m x m measurement noise covariance
// Returns posterior {x, P}.

function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, k = A[0].length, n = B[0].length;
  const C: number[][] = [];
  for (let i = 0; i < m; i++) {
    const row = new Array(n).fill(0);
    for (let p = 0; p < k; p++) {
      const aip = A[i][p];
      for (let j = 0; j < n; j++) row[j] += aip * B[p][j];
    }
    C.push(row);
  }
  return C;
}

function matVec(A: number[][], x: number[]): number[] {
  return A.map((row) => row.reduce((s, v, j) => s + v * x[j], 0));
}

function transpose(A: number[][]): number[][] {
  const m = A.length, n = A[0].length;
  const T: number[][] = [];
  for (let j = 0; j < n; j++) {
    const row = new Array(m);
    for (let i = 0; i < m; i++) row[i] = A[i][j];
    T.push(row);
  }
  return T;
}

function addM(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((v, j) => v + B[i][j]));
}

function subM(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((v, j) => v - B[i][j]));
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

function inverse(A: number[][]): number[][] {
  const n = A.length;
  // Gauss-Jordan
  const M: number[][] = A.map((row, i) => [...row, ...eye(n)[i]]);
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[pivot][i])) pivot = r;
    if (M[pivot][i] === 0) throw new Error('kalmanFilterStep: singular innovation covariance');
    if (pivot !== i) {
      const tmp = M[i]; M[i] = M[pivot]; M[pivot] = tmp;
    }
    const piv = M[i][i];
    for (let j = 0; j < 2 * n; j++) M[i][j] /= piv;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const factor = M[r][i];
      if (factor === 0) continue;
      for (let j = 0; j < 2 * n; j++) M[r][j] -= factor * M[i][j];
    }
  }
  return M.map((row) => row.slice(n));
}

export interface KalmanStepInput {
  x: number[];
  P: number[][];
  F: number[][];
  Q: number[][];
  z: number[];
  H: number[][];
  R: number[][];
}

export interface KalmanStepOutput {
  x: number[];
  P: number[][];
}

export function kalmanFilterStep(input: KalmanStepInput): KalmanStepOutput {
  const { x, P, F, Q, z, H, R } = input;
  if (!Array.isArray(x) || x.length === 0) throw new Error('kalmanFilterStep: empty x');
  const n = x.length;
  if (P.length !== n) throw new Error('kalmanFilterStep: P dim mismatch');
  if (F.length !== n) throw new Error('kalmanFilterStep: F dim mismatch');
  if (Q.length !== n) throw new Error('kalmanFilterStep: Q dim mismatch');
  const m = z.length;
  if (H.length !== m) throw new Error('kalmanFilterStep: H dim mismatch');
  if (R.length !== m) throw new Error('kalmanFilterStep: R dim mismatch');

  // Predict
  const xPred = matVec(F, x);
  const FP = matMul(F, P);
  const PPred = addM(matMul(FP, transpose(F)), Q);

  // Update
  const Hx = matVec(H, xPred);
  const y: number[] = z.map((zi, i) => zi - Hx[i]);
  const HP = matMul(H, PPred);
  const S = addM(matMul(HP, transpose(H)), R);
  const Sinv = inverse(S);
  const PHt = matMul(PPred, transpose(H));
  const K = matMul(PHt, Sinv);
  const Ky = matVec(K, y);
  const xNew = xPred.map((v, i) => v + Ky[i]);
  const KH = matMul(K, H);
  const I = eye(n);
  const PNew = matMul(subM(I, KH), PPred);

  return { x: xNew, P: PNew };
}
