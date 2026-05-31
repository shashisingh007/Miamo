function mulmod(a: bigint, b: bigint, m: bigint): bigint {
  return (a * b) % m;
}

function powmod(base: bigint, exp: bigint, m: bigint): bigint {
  let result = 1n;
  let b = base % m;
  let e = exp;
  while (e > 0n) {
    if ((e & 1n) === 1n) result = mulmod(result, b, m);
    b = mulmod(b, b, m);
    e >>= 1n;
  }
  return result;
}

const DETERMINISTIC_WITNESSES_64BIT: bigint[] = [
  2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n,
];

export function millerRabinIsPrime(n: number | bigint): boolean {
  const bn = typeof n === 'bigint' ? n : BigInt(n);
  if (bn < 2n) return false;
  if (bn === 2n || bn === 3n) return true;
  if ((bn & 1n) === 0n) return false;

  // Write n-1 = d * 2^s
  let d = bn - 1n;
  let s = 0n;
  while ((d & 1n) === 0n) { d >>= 1n; s += 1n; }

  for (const a of DETERMINISTIC_WITNESSES_64BIT) {
    if (a >= bn) continue;
    let x = powmod(a, d, bn);
    if (x === 1n || x === bn - 1n) continue;
    let composite = true;
    for (let r = 1n; r < s; r++) {
      x = mulmod(x, x, bn);
      if (x === bn - 1n) { composite = false; break; }
    }
    if (composite) return false;
  }
  return true;
}
