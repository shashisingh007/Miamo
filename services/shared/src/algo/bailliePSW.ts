function powMod(a: bigint, e: bigint, m: bigint): bigint {
  let r = 1n;
  let b = a % m;
  if (b < 0n) b += m;
  let k = e;
  while (k > 0n) {
    if (k & 1n) r = (r * b) % m;
    b = (b * b) % m;
    k >>= 1n;
  }
  return r;
}

function gcdBig(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

function isqrt(n: bigint): bigint {
  if (n < 0n) throw new Error('isqrt: negative');
  if (n < 2n) return n;
  let x = n;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + n / x) / 2n;
  }
  return x;
}

function isPerfectSquare(n: bigint): boolean {
  const r = isqrt(n);
  return r * r === n;
}

function millerRabinBase2(n: bigint): boolean {
  if (n < 2n) return false;
  if (n === 2n) return true;
  if (n % 2n === 0n) return false;
  let d = n - 1n;
  let s = 0n;
  while ((d & 1n) === 0n) {
    d >>= 1n;
    s++;
  }
  let x = powMod(2n, d, n);
  if (x === 1n || x === n - 1n) return true;
  for (let r = 1n; r < s; r++) {
    x = (x * x) % n;
    if (x === n - 1n) return true;
  }
  return false;
}

function jacobi(a: bigint, n: bigint): number {
  if (n <= 0n || (n & 1n) === 0n) throw new Error('jacobi: n must be positive odd');
  let x = ((a % n) + n) % n;
  let m = n;
  let result = 1;
  while (x !== 0n) {
    while ((x & 1n) === 0n) {
      x >>= 1n;
      const r = m % 8n;
      if (r === 3n || r === 5n) result = -result;
    }
    const t = x;
    x = m;
    m = t;
    if (x % 4n === 3n && m % 4n === 3n) result = -result;
    x = x % m;
  }
  return m === 1n ? result : 0;
}

function lucasStrong(n: bigint): boolean {
  let D = 5n;
  let sign = 1n;
  while (true) {
    const d = sign * D;
    const j = jacobi(d, n);
    if (j === -1) {
      D = d;
      break;
    }
    if (j === 0 && (((d % n) + n) % n) !== 0n) return false;
    if (D === 5n && sign === 1n && isPerfectSquare(n)) return false;
    D += 2n;
    sign = -sign;
  }
  const P = 1n;
  const Q = (1n - D) / 4n;
  let d = n + 1n;
  let s = 0n;
  while ((d & 1n) === 0n) {
    d >>= 1n;
    s++;
  }
  let U = 1n;
  let V = P;
  let Qk = Q;
  const bits: number[] = [];
  let dd = d;
  while (dd > 0n) {
    bits.push(Number(dd & 1n));
    dd >>= 1n;
  }
  for (let i = bits.length - 2; i >= 0; i--) {
    U = (U * V) % n;
    V = (V * V - 2n * Qk) % n;
    Qk = (Qk * Qk) % n;
    if (bits[i] === 1) {
      const Un = (P * U + V) % n;
      const Vn = (D * U + P * V) % n;
      U = Un % 2n === 0n ? Un / 2n : (Un + n) / 2n;
      V = Vn % 2n === 0n ? Vn / 2n : (Vn + n) / 2n;
      U = ((U % n) + n) % n;
      V = ((V % n) + n) % n;
      Qk = (Qk * Q) % n;
    }
  }
  if (U === 0n || V === 0n) return true;
  for (let r = 0n; r < s - 1n; r++) {
    V = (V * V - 2n * Qk) % n;
    V = ((V % n) + n) % n;
    if (V === 0n) return true;
    Qk = (Qk * Qk) % n;
  }
  return false;
}

const SMALL_PRIMES: bigint[] = [
  2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n, 43n, 47n, 53n, 59n, 61n, 67n, 71n,
  73n, 79n, 83n, 89n, 97n,
];

export function bailliePSW(n: bigint): boolean {
  if (n < 2n) return false;
  for (const p of SMALL_PRIMES) {
    if (n === p) return true;
    if (n % p === 0n) return false;
  }
  if (!millerRabinBase2(n)) return false;
  if (isPerfectSquare(n)) return false;
  return lucasStrong(n);
}
