/**
 * Berlekamp–Massey algorithm: computes the shortest LFSR that generates a binary sequence.
 * Returns the connection polynomial coefficients C(x) = 1 + c1*x + c2*x^2 + ... and its length L.
 */

export interface BerlekampMasseyResult {
  c: number[]; // length L+1, c[0]=1
  L: number;
}

export function berlekampMassey(seq: number[]): BerlekampMasseyResult {
  if (!Array.isArray(seq)) throw new Error('seq must be array');
  for (const s of seq) {
    if (s !== 0 && s !== 1) throw new Error('seq must contain only 0/1');
  }
  const n = seq.length;

  let c = [1];
  let b = [1];
  let L = 0;
  let m = 1;
  let bDelta = 1;

  for (let nIdx = 0; nIdx < n; nIdx++) {
    let d = seq[nIdx];
    for (let i = 1; i <= L; i++) {
      d ^= (c[i] ?? 0) & seq[nIdx - i];
    }
    if (d === 1) {
      const t = c.slice();
      const shift = m;
      // c = c xor (b shifted by m)
      const need = shift + b.length;
      while (c.length < need) c.push(0);
      for (let i = 0; i < b.length; i++) {
        c[i + shift] = (c[i + shift] ?? 0) ^ ((b[i] ?? 0) & bDelta);
      }
      if (2 * L <= nIdx) {
        L = nIdx + 1 - L;
        b = t;
        bDelta = 1;
        m = 1;
      } else {
        m += 1;
      }
    } else {
      m += 1;
    }
  }

  // trim trailing zeros beyond L
  c = c.slice(0, L + 1);
  while (c.length < L + 1) c.push(0);
  return { c, L };
}
