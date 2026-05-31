function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function matVec(A: number[][], x: number[]): number[] {
  const n = A.length;
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += A[i][j] * x[j];
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
    if (Math.abs(M[p][i]) < 1e-14) throw new Error('doglegStep: singular Hessian');
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

export interface DoglegResult {
  step: number[];
  type: 'newton' | 'cauchy' | 'dogleg';
  norm: number;
}

export function doglegStep(B: number[][], g: number[], delta: number): DoglegResult {
  const n = B.length;
  if (n === 0) throw new Error('doglegStep: empty B');
  for (const row of B) if (row.length !== n) throw new Error('doglegStep: B must be square');
  if (g.length !== n) throw new Error('doglegStep: g size mismatch');
  if (!(delta > 0)) throw new Error('doglegStep: delta>0');
  const negG = g.map((v) => -v);
  const pN = solveLU(B, negG);
  const pNn = Math.sqrt(dot(pN, pN));
  if (pNn <= delta) {
    return { step: pN, type: 'newton', norm: pNn };
  }
  const Bg = matVec(B, g);
  const gBg = dot(g, Bg);
  if (gBg <= 0) {
    const gn = Math.sqrt(dot(g, g));
    if (gn === 0) return { step: new Array(n).fill(0), type: 'cauchy', norm: 0 };
    const step = negG.map((v) => v * (delta / gn));
    return { step, type: 'cauchy', norm: delta };
  }
  const tau = dot(g, g) / gBg;
  const pU = negG.map((v) => v * tau);
  const pUn = Math.sqrt(dot(pU, pU));
  if (pUn >= delta) {
    const s = delta / pUn;
    const step = pU.map((v) => v * s);
    return { step, type: 'cauchy', norm: delta };
  }
  const diff = pN.map((v, i) => v - pU[i]);
  const a = dot(diff, diff);
  const b = 2 * dot(pU, diff);
  const c = dot(pU, pU) - delta * delta;
  const disc = b * b - 4 * a * c;
  if (disc < 0) throw new Error('doglegStep: negative discriminant');
  const t = (-b + Math.sqrt(disc)) / (2 * a);
  const step = pU.map((v, i) => v + t * diff[i]);
  return { step, type: 'dogleg', norm: Math.sqrt(dot(step, step)) };
}
