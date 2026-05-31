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

function mulMod(a: bigint, b: bigint, m: bigint): bigint {
  return (a * b) % m;
}

export function pollardRhoFactor(n: bigint): bigint | null {
  if (n <= 1n) throw new RangeError('n must be > 1');
  if (n % 2n === 0n) return 2n;
  let attempt = 0n;
  while (attempt < 20n) {
    const c = (attempt + 1n) % n;
    let x = 2n;
    let y = 2n;
    let d = 1n;
    const f = (v: bigint) => (mulMod(v, v, n) + c) % n;
    while (d === 1n) {
      x = f(x);
      y = f(f(y));
      const diff = x > y ? x - y : y - x;
      d = gcdBig(diff, n);
    }
    if (d !== n) return d;
    attempt += 1n;
  }
  return null;
}
