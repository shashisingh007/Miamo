function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let r = 1n;
  let b = base % mod;
  if (b < 0n) b += mod;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) r = (r * b) % mod;
    e >>= 1n;
    b = (b * b) % mod;
  }
  return r;
}

function isProbablePrime(n: bigint): boolean {
  if (n < 2n) return false;
  const small = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];
  for (const p of small) {
    if (n === p) return true;
    if (n % p === 0n) return false;
  }
  let d = n - 1n;
  let r = 0;
  while ((d & 1n) === 0n) {
    d >>= 1n;
    r++;
  }
  WitnessLoop: for (const a of small) {
    if (a % n === 0n) continue;
    let x = modPow(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    for (let i = 0; i < r - 1; i++) {
      x = (x * x) % n;
      if (x === n - 1n) continue WitnessLoop;
    }
    return false;
  }
  return true;
}

function legendre(a: bigint, p: bigint): bigint {
  return modPow(a, (p - 1n) / 2n, p);
}

export interface CipollaResult {
  root: bigint;
  other: bigint;
}

export function cipollaSqrt(n: number | bigint, p: number | bigint): CipollaResult | null {
  const P = typeof p === 'bigint' ? p : BigInt(p);
  if (P < 2n) throw new Error('cipollaSqrt: p must be prime >= 2');
  if (!isProbablePrime(P)) throw new Error('cipollaSqrt: p must be prime');
  let N = typeof n === 'bigint' ? n : BigInt(n);
  N = N % P;
  if (N < 0n) N += P;
  if (N === 0n) return { root: 0n, other: 0n };
  if (P === 2n) return { root: N, other: N };
  // check residue
  const leg = legendre(N, P);
  if (leg === P - 1n) return null;
  // Special case p ≡ 3 (mod 4)
  if ((P & 3n) === 3n) {
    const r = modPow(N, (P + 1n) / 4n, P);
    return { root: r, other: P - r };
  }
  // Find a such that a^2 - n is non-residue
  let a = 0n;
  let omega2 = 0n;
  // simple search
  for (let i = 1n; i < P; i++) {
    const w = (i * i - N) % P;
    const wm = w < 0n ? w + P : w;
    if (legendre(wm, P) === P - 1n) {
      a = i;
      omega2 = wm;
      break;
    }
  }
  // exponentiate (a + ω) to (p+1)/2 in the field Fp[ω] / (ω^2 - omega2)
  // element = (x + y ω); multiply: (x1+y1ω)(x2+y2ω) = (x1x2 + y1y2 omega2) + (x1y2 + y1x2) ω
  const exp = (P + 1n) / 2n;
  let rx = 1n;
  let ry = 0n;
  let bx = a % P;
  let by = 1n;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) {
      const nx = (rx * bx + ((ry * by) % P) * omega2) % P;
      const ny = (rx * by + ry * bx) % P;
      rx = nx;
      ry = ny;
    }
    const nx = (bx * bx + ((by * by) % P) * omega2) % P;
    const ny = (2n * bx * by) % P;
    bx = nx;
    by = ny;
    e >>= 1n;
  }
  // result should have ry === 0
  if (ry !== 0n) return null;
  let root = rx % P;
  if (root < 0n) root += P;
  return { root, other: P - root };
}
