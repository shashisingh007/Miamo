export interface KaczmarzOptions {
  maxIter?: number;
  tol?: number;
  x0?: number[];
  randomized?: boolean;
  seed?: number;
}

export interface KaczmarzResult {
  x: number[];
  iters: number;
  residual: number;
  converged: boolean;
}

function mulberry32(a: number): () => number {
  let t = a >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function kaczmarzMethod(
  A: number[][],
  b: number[],
  opts: KaczmarzOptions = {},
): KaczmarzResult {
  const m = A.length;
  if (m === 0) throw new Error('kaczmarz: empty A');
  const n = A[0].length;
  for (const row of A) if (row.length !== n) throw new Error('kaczmarz: rows uneven');
  if (b.length !== m) throw new Error('kaczmarz: b length mismatch');
  const maxIter = opts.maxIter ?? 1000;
  const tol = opts.tol ?? 1e-10;
  if (!(maxIter >= 1)) throw new Error('kaczmarz: maxIter>=1');
  if (!(tol > 0)) throw new Error('kaczmarz: tol>0');
  const x = opts.x0 ? opts.x0.slice() : new Array(n).fill(0);
  if (x.length !== n) throw new Error('kaczmarz: x0 length mismatch');
  const sqNorms = A.map((row) => row.reduce((s, v) => s + v * v, 0));
  for (const v of sqNorms) if (v === 0) throw new Error('kaczmarz: zero row');
  const rand = mulberry32(opts.seed ?? 1);
  let it = 0;
  let residual = Infinity;
  let converged = false;
  for (it = 0; it < maxIter; it++) {
    const i = opts.randomized ? Math.floor(rand() * m) : it % m;
    let s = 0;
    for (let j = 0; j < n; j++) s += A[i][j] * x[j];
    const t = (b[i] - s) / sqNorms[i];
    for (let j = 0; j < n; j++) x[j] += t * A[i][j];
    if ((it + 1) % m === 0 || it === maxIter - 1) {
      let r = 0;
      for (let k = 0; k < m; k++) {
        let ss = 0;
        for (let j = 0; j < n; j++) ss += A[k][j] * x[j];
        const d = ss - b[k];
        r += d * d;
      }
      residual = Math.sqrt(r);
      if (residual < tol) {
        converged = true;
        it++;
        break;
      }
    }
  }
  for (const v of x) if (!Number.isFinite(v)) throw new Error('kaczmarz: non-finite');
  return { x, iters: it, residual, converged };
}
