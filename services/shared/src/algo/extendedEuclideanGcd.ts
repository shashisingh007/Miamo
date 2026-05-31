export interface ExtendedEuclideanResult {
  gcd: number;
  x: number;
  y: number;
}

export function extendedEuclideanGcd(a: number, b: number): ExtendedEuclideanResult {
  if (!Number.isInteger(a) || !Number.isInteger(b)) throw new RangeError('a and b must be integers');
  let oldR = a;
  let r = b;
  let oldS = 1;
  let s = 0;
  let oldT = 0;
  let t = 1;
  while (r !== 0) {
    const q = Math.trunc(oldR / r);
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
    [oldT, t] = [t, oldT - q * t];
  }
  if (oldR < 0) {
    oldR = -oldR;
    oldS = -oldS;
    oldT = -oldT;
  }
  return { gcd: oldR, x: oldS, y: oldT };
}

export function modularInverse(a: number, m: number): number {
  if (!Number.isInteger(a) || !Number.isInteger(m)) throw new RangeError('a and m must be integers');
  if (m <= 0) throw new RangeError('m must be > 0');
  const { gcd, x } = extendedEuclideanGcd(((a % m) + m) % m, m);
  if (gcd !== 1) throw new RangeError('modular inverse does not exist');
  return ((x % m) + m) % m;
}
