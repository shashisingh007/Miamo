export interface GivensCS {
  c: number;
  s: number;
}

export function givensRotation(a: number, b: number): GivensCS {
  if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error('givens: non-finite');
  if (b === 0) {
    return { c: a >= 0 ? 1 : -1, s: 0 };
  }
  if (Math.abs(b) > Math.abs(a)) {
    const t = -a / b;
    const s = 1 / Math.sqrt(1 + t * t);
    const c = s * t;
    return { c, s };
  }
  const t = -b / a;
  const c = 1 / Math.sqrt(1 + t * t);
  const s = c * t;
  return { c, s };
}

export function applyGivensLeft(A: number[][], i: number, k: number, c: number, s: number): number[][] {
  if (A.length === 0) throw new Error('givens.applyLeft: empty A');
  const m = A.length;
  if (!(i >= 0 && i < m)) throw new Error('givens.applyLeft: i OOB');
  if (!(k >= 0 && k < m)) throw new Error('givens.applyLeft: k OOB');
  if (i === k) throw new Error('givens.applyLeft: i==k');
  const cols = A[0].length;
  const out = A.map((r) => r.slice());
  for (let j = 0; j < cols; j++) {
    const tau1 = out[i][j];
    const tau2 = out[k][j];
    out[i][j] = c * tau1 - s * tau2;
    out[k][j] = s * tau1 + c * tau2;
  }
  return out;
}

export function applyGivensRight(A: number[][], i: number, k: number, c: number, s: number): number[][] {
  if (A.length === 0) throw new Error('givens.applyRight: empty A');
  const cols = A[0].length;
  if (!(i >= 0 && i < cols)) throw new Error('givens.applyRight: i OOB');
  if (!(k >= 0 && k < cols)) throw new Error('givens.applyRight: k OOB');
  if (i === k) throw new Error('givens.applyRight: i==k');
  const out = A.map((r) => r.slice());
  for (let j = 0; j < A.length; j++) {
    const tau1 = out[j][i];
    const tau2 = out[j][k];
    out[j][i] = c * tau1 - s * tau2;
    out[j][k] = s * tau1 + c * tau2;
  }
  return out;
}
