// Cyclic reduction for tridiagonal systems Ax = d.
//   sub:   length n, sub[0] is unused (set to 0)
//   diag:  length n
//   sup:   length n, sup[n-1] is unused (set to 0)
//   rhs:   length n
// Eliminates odd-indexed rows recursively, then back-substitutes.

function solveCR(sub: number[], diag: number[], sup: number[], rhs: number[]): number[] {
  const n = diag.length;
  if (n === 1) {
    if (diag[0] === 0) throw new Error('cyclicReductionTridiag: zero pivot');
    return [rhs[0] / diag[0]];
  }
  const evenCount = Math.ceil(n / 2);
  const a2 = new Array(evenCount).fill(0);
  const b2 = new Array(evenCount).fill(0);
  const c2 = new Array(evenCount).fill(0);
  const d2 = new Array(evenCount).fill(0);
  for (let k = 0; k < evenCount; k++) {
    const i = 2 * k;
    const hasL = i - 1 >= 0;
    const hasR = i + 1 < n;
    const alpha = hasL ? sub[i] / diag[i - 1] : 0;
    const gamma = hasR ? sup[i] / diag[i + 1] : 0;
    if (hasL && diag[i - 1] === 0) throw new Error('cyclicReductionTridiag: zero pivot');
    if (hasR && diag[i + 1] === 0) throw new Error('cyclicReductionTridiag: zero pivot');
    let bi = diag[i];
    if (hasL) bi -= alpha * sup[i - 1];
    if (hasR) bi -= gamma * sub[i + 1];
    const ai = i - 2 >= 0 ? -alpha * sub[i - 1] : 0;
    const ci = i + 2 < n ? -gamma * sup[i + 1] : 0;
    let di = rhs[i];
    if (hasL) di -= alpha * rhs[i - 1];
    if (hasR) di -= gamma * rhs[i + 1];
    a2[k] = ai;
    b2[k] = bi;
    c2[k] = ci;
    d2[k] = di;
  }
  const xeven = solveCR(a2, b2, c2, d2);
  const x = new Array(n);
  for (let k = 0; k < evenCount; k++) x[2 * k] = xeven[k];
  for (let i = 1; i < n; i += 2) {
    if (diag[i] === 0) throw new Error('cyclicReductionTridiag: zero pivot');
    const left = i - 1 >= 0 ? x[i - 1] : 0;
    const right = i + 1 < n ? x[i + 1] : 0;
    x[i] = (rhs[i] - sub[i] * left - sup[i] * right) / diag[i];
  }
  return x;
}

export function cyclicReductionTridiag(
  sub: number[],
  diag: number[],
  sup: number[],
  rhs: number[],
): number[] {
  if (!Array.isArray(sub) || !Array.isArray(diag) || !Array.isArray(sup) || !Array.isArray(rhs)) {
    throw new Error('cyclicReductionTridiag: arrays required');
  }
  const n = diag.length;
  if (n === 0) throw new Error('cyclicReductionTridiag: empty');
  if (sub.length !== n || sup.length !== n || rhs.length !== n) {
    throw new Error('cyclicReductionTridiag: length mismatch');
  }
  return solveCR(sub.slice(), diag.slice(), sup.slice(), rhs.slice());
}
