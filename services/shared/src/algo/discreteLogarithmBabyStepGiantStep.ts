function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let b = ((base % mod) + mod) % mod;
  let e = exp;
  let r = 1n;
  while (e > 0n) {
    if (e & 1n) r = (r * b) % mod;
    b = (b * b) % mod;
    e >>= 1n;
  }
  return r;
}

function modInverse(a: bigint, m: bigint): bigint {
  let old_r = a;
  let r = m;
  let old_s = 1n;
  let s = 0n;
  while (r !== 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  if (old_r !== 1n) throw new RangeError('inverse does not exist');
  return ((old_s % m) + m) % m;
}

export function discreteLogarithmBSGS(g: bigint, h: bigint, p: bigint): bigint | null {
  if (p <= 1n) throw new RangeError('p must be > 1');
  const m = BigInt(Math.ceil(Math.sqrt(Number(p))));
  const table = new Map<string, bigint>();
  let v = 1n;
  for (let j = 0n; j < m; j += 1n) {
    if (!table.has(v.toString())) table.set(v.toString(), j);
    v = (v * g) % p;
  }
  const gm = modPow(g, m, p);
  const gmInv = modInverse(gm, p);
  let y = h % p;
  for (let i = 0n; i < m; i += 1n) {
    const j = table.get(y.toString());
    if (j !== undefined) return i * m + j;
    y = (y * gmInv) % p;
  }
  return null;
}
