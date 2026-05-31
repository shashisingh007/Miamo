function modInv(a: bigint, m: bigint): bigint {
  let [old_r, r] = [((a % m) + m) % m, m];
  let [old_s, s] = [1n, 0n];
  while (r !== 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  if (old_r !== 1n) throw new Error('modInv: not invertible');
  return ((old_s % m) + m) % m;
}

export function montgomeryPowMod(base: bigint, exp: bigint, mod: bigint): bigint {
  if (mod <= 0n) throw new Error('montgomeryPowMod: mod>0 required');
  if (exp < 0n) throw new Error('montgomeryPowMod: exp>=0 required');
  if (mod === 1n) return 0n;
  if ((mod & 1n) === 0n) {
    let r = 1n % mod;
    let b = ((base % mod) + mod) % mod;
    let e = exp;
    while (e > 0n) {
      if (e & 1n) r = (r * b) % mod;
      b = (b * b) % mod;
      e >>= 1n;
    }
    return r;
  }
  let bits = 0n;
  for (let m = mod; m > 0n; m >>= 1n) bits++;
  const R = 1n << bits;
  const Rmask = R - 1n;
  const Nprime = R - modInv(mod, R);
  const RmodN = R % mod;
  const R2modN = (RmodN * RmodN) % mod;
  const reduce = (T: bigint): bigint => {
    const m = ((T & Rmask) * Nprime) & Rmask;
    let t = (T + m * mod) >> bits;
    if (t >= mod) t -= mod;
    return t;
  };
  const baseN = ((base % mod) + mod) % mod;
  const baseM = reduce(baseN * R2modN);
  let resM = reduce(R2modN);
  let e = exp;
  const eBits: number[] = [];
  while (e > 0n) {
    eBits.push(Number(e & 1n));
    e >>= 1n;
  }
  for (let i = eBits.length - 1; i >= 0; i--) {
    resM = reduce(resM * resM);
    if (eBits[i] === 1) resM = reduce(resM * baseM);
  }
  return reduce(resM);
}
