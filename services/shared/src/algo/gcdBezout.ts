// Extended Euclidean / Bezout coefficients.
// Returns gcd(a, b) and integers x, y with a*x + b*y = gcd(a, b).
// Uses BigInt internally to avoid overflow on 32-bit boundaries.

export interface BezoutResult {
  gcd: bigint;
  x: bigint;
  y: bigint;
}

export function gcdBezout(a: bigint | number, b: bigint | number): BezoutResult {
  let A = typeof a === 'bigint' ? a : BigInt(a);
  let B = typeof b === 'bigint' ? b : BigInt(b);
  let oldR = A;
  let r = B;
  let oldS = 1n;
  let s = 0n;
  let oldT = 0n;
  let t = 1n;
  while (r !== 0n) {
    const q = oldR / r; // BigInt truncates toward zero, which is fine here.
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
    [oldT, t] = [t, oldT - q * t];
  }
  if (oldR < 0n) {
    return { gcd: -oldR, x: -oldS, y: -oldT };
  }
  return { gcd: oldR, x: oldS, y: oldT };
}

export function modInverseBezout(a: bigint | number, m: bigint | number): bigint | null {
  const M = typeof m === 'bigint' ? m : BigInt(m);
  if (M <= 0n) throw new RangeError('modulus must be positive');
  const A = typeof a === 'bigint' ? a : BigInt(a);
  const r = gcdBezout(((A % M) + M) % M, M);
  if (r.gcd !== 1n) return null;
  return ((r.x % M) + M) % M;
}
