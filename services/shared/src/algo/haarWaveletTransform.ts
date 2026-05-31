// 1D Haar wavelet transform.
// Input length must be a power of two. Returns the orthonormal Haar coefficients:
// [scaling_coefficient, details_level_log2(N), ..., details_level_1].
// Inverse reconstructs the original signal.

const SQRT2 = Math.sqrt(2);

function isPow2(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

export function haarWaveletTransform(x: number[]): number[] {
  const n = x.length;
  if (n === 0) throw new Error('haarWaveletTransform: empty');
  if (!isPow2(n)) throw new Error('haarWaveletTransform: length must be a power of two');

  let cur = x.slice();
  const details: number[][] = [];
  while (cur.length > 1) {
    const m = cur.length / 2;
    const a = new Array(m);
    const d = new Array(m);
    for (let i = 0; i < m; i++) {
      a[i] = (cur[2 * i] + cur[2 * i + 1]) / SQRT2;
      d[i] = (cur[2 * i] - cur[2 * i + 1]) / SQRT2;
    }
    details.push(d);
    cur = a;
  }
  const out: number[] = [cur[0]];
  for (let i = details.length - 1; i >= 0; i--) for (const v of details[i]) out.push(v);
  return out;
}

export function haarWaveletInverse(coeffs: number[]): number[] {
  const n = coeffs.length;
  if (n === 0) throw new Error('haarWaveletInverse: empty');
  if (!isPow2(n)) throw new Error('haarWaveletInverse: length must be a power of two');

  let cur: number[] = [coeffs[0]];
  let idx = 1;
  while (cur.length < n) {
    const m = cur.length;
    const next = new Array(2 * m);
    for (let i = 0; i < m; i++) {
      const a = cur[i];
      const d = coeffs[idx + i];
      next[2 * i] = (a + d) / SQRT2;
      next[2 * i + 1] = (a - d) / SQRT2;
    }
    idx += m;
    cur = next;
  }
  return cur;
}
