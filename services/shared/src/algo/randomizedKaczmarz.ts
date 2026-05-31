// Randomized Kaczmarz iteration for solving Ax = b.
// At each step, pick a row i with probability proportional to ||a_i||^2,
// then project x onto the hyperplane a_i . x = b_i.

export interface RandomizedKaczmarzOptions {
  iterations?: number;
  seed?: number;
  x0?: number[];
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomizedKaczmarz(
  A: number[][],
  b: number[],
  opts: RandomizedKaczmarzOptions = {},
): number[] {
  if (!Array.isArray(A) || A.length === 0) throw new Error('randomizedKaczmarz: empty A');
  const m = A.length;
  const n = A[0].length;
  if (n === 0) throw new Error('randomizedKaczmarz: zero-width A');
  for (const row of A) if (row.length !== n) throw new Error('randomizedKaczmarz: ragged A');
  if (b.length !== m) throw new Error('randomizedKaczmarz: b length mismatch');

  const rowSqNorms = A.map((row) => row.reduce((s, v) => s + v * v, 0));
  const totalSq = rowSqNorms.reduce((s, v) => s + v, 0);
  if (totalSq <= 0) throw new Error('randomizedKaczmarz: all rows zero');

  const iterations = opts.iterations ?? 1000;
  if (!Number.isInteger(iterations) || iterations <= 0) throw new Error('randomizedKaczmarz: iterations must be positive int');

  const x = opts.x0 ? opts.x0.slice() : new Array(n).fill(0);
  if (x.length !== n) throw new Error('randomizedKaczmarz: x0 length mismatch');

  const rand = mulberry32(opts.seed ?? 1);

  // Cumulative distribution over rows by squared norm
  const cdf = new Array(m);
  let acc = 0;
  for (let i = 0; i < m; i++) {
    acc += rowSqNorms[i] / totalSq;
    cdf[i] = acc;
  }

  for (let it = 0; it < iterations; it++) {
    const u = rand();
    let i = 0;
    while (i < m - 1 && u > cdf[i]) i++;
    const ai = A[i];
    let dot = 0;
    for (let j = 0; j < n; j++) dot += ai[j] * x[j];
    const norm2 = rowSqNorms[i];
    if (norm2 === 0) continue;
    const factor = (b[i] - dot) / norm2;
    for (let j = 0; j < n; j++) x[j] += factor * ai[j];
  }
  return x;
}
