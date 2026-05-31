export function nevilleInterp(xs: number[], ys: number[], x: number): number {
  const n = xs.length;
  if (n === 0) throw new Error('empty samples');
  if (ys.length !== n) throw new Error('xs/ys length mismatch');
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (xs[i] === xs[j]) throw new Error('duplicate x');
    }
  }
  const p = ys.slice();
  for (let k = 1; k < n; k++) {
    for (let i = 0; i < n - k; i++) {
      const denom = xs[i] - xs[i + k];
      p[i] = ((x - xs[i + k]) * p[i] - (x - xs[i]) * p[i + 1]) / denom;
    }
  }
  return p[0];
}
