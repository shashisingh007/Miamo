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
  const witnesses = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];
  WitnessLoop: for (const a of witnesses) {
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

export function legendreSymbol(a: number | bigint, p: number | bigint): -1 | 0 | 1 {
  const A = typeof a === 'bigint' ? a : BigInt(a);
  const P = typeof p === 'bigint' ? p : BigInt(p);
  if (P < 3n || (P & 1n) === 0n) throw new Error('legendreSymbol: p must be odd prime >= 3');
  if (!isProbablePrime(P)) throw new Error('legendreSymbol: p must be prime');
  let mod = A % P;
  if (mod < 0n) mod += P;
  if (mod === 0n) return 0;
  const r = modPow(mod, (P - 1n) / 2n, P);
  if (r === 1n) return 1;
  if (r === P - 1n) return -1;
  throw new Error('legendreSymbol: unexpected result');
}
